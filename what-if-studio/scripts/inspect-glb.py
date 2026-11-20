import json, struct, sys, math
import numpy as np

def load_glb(path):
    with open(path,'rb') as f: data=f.read()
    magic,ver,length=struct.unpack_from('<III',data,0)
    assert magic==0x46546C67, 'not glb'
    off=12; js=None; binchunk=None
    while off<length:
        clen,ctype=struct.unpack_from('<II',data,off); off+=8
        chunk=data[off:off+clen]; off+=clen
        if ctype==0x4E4F534A: js=json.loads(chunk.decode('utf-8'))
        elif ctype==0x004E4942: binchunk=chunk
    return js,binchunk

def trs_matrix(node):
    if 'matrix' in node:
        return np.array(node['matrix'],dtype=float).reshape(4,4).T
    T=np.eye(4)
    if 'translation' in node: T[:3,3]=node['translation']
    R=np.eye(4)
    if 'rotation' in node:
        x,y,z,w=node['rotation']
        R[:3,:3]=np.array([
            [1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
            [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
            [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
    S=np.eye(4)
    if 'scale' in node: S[0,0],S[1,1],S[2,2]=node['scale']
    return T@R@S

def world_matrices(js):
    nodes=js['nodes']; parent={}
    for i,n in enumerate(nodes):
        for c in n.get('children',[]): parent[c]=i
    cache={}
    def wm(i):
        if i in cache: return cache[i]
        m=trs_matrix(nodes[i])
        if i in parent: m=wm(parent[i])@m
        cache[i]=m; return m
    return [wm(i) for i in range(len(nodes))]

def accessor_array(js,binchunk,idx):
    acc=js['accessors'][idx]; bv=js['bufferViews'][acc['bufferView']]
    comp={5120:('b',1),5121:('B',1),5122:('h',2),5123:('H',2),5125:('I',4),5126:('f',4)}[acc['componentType']]
    ncomp={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[acc['type']]
    base=bv.get('byteOffset',0)+acc.get('byteOffset',0)
    stride=bv.get('byteStride',comp[1]*ncomp)
    out=np.empty((acc['count'],ncomp),dtype=np.float32 if comp[0]=='f' else np.int64)
    for i in range(acc['count']):
        vals=struct.unpack_from('<'+comp[0]*ncomp,binchunk,base+i*stride)
        out[i]=vals
    return out

def main(path):
    js,b=load_glb(path); nodes=js['nodes']; W=world_matrices(js)
    print('===',path,'nodes',len(nodes),'meshes',len(js.get('meshes',[])),'skins',len(js.get('skins',[])),'anims',len(js.get('animations',[])))
    print('--- key bones ---')
    for i,n in enumerate(nodes):
        if n.get('name') and any(k in n['name'].lower() for k in ['head','neck','spine','eye','jaw','mouth']):
            p=W[i][:3,3]
            print(f"{n['name']:24s} world {p.round(4).tolist()}")
    print('--- meshes ---')
    for i,n in enumerate(nodes):
        if 'mesh' not in n: continue
        mesh=js['meshes'][n['mesh']]; name=n.get('name') or mesh.get('name')
        matidx=mesh['primitives'][0].get('material')
        matname=js['materials'][matidx].get('name') if matidx is not None else None
        allv=[]
        for prim in mesh['primitives']:
            pos=accessor_array(js,b,prim['attributes']['POSITION'])
            # to world
            v=np.concatenate([pos,np.ones((len(pos),1),dtype=np.float32)],axis=1)
            vw=(W[i]@v.T).T[:,:3]
            allv.append(vw)
        vw=np.concatenate(allv,axis=0)
        print(f"MESH {name:28s} mat {matname} verts {len(vw)} world min {vw.min(0).round(3).tolist()} max {vw.max(0).round(3).tolist()}")
        if matname and 'hair' in str(matname).lower():
            head=vw[vw[:,1]>1.45]
            if len(head): print('   hair/head verts box',head.min(0).round(4).tolist(),head.max(0).round(4).tolist())
        if matname and 'eye' in str(matname).lower():
            print('   EYE box',vw.min(0).round(4).tolist(),vw.max(0).round(4).tolist(),'center',((vw.min(0)+vw.max(0))/2).round(4).tolist())
        # body head-ish
        if matname and 'superhero' in str(matname).lower():
            head=vw[vw[:,1]>1.45]
            if len(head):
                print('   body head-ish box',head.min(0).round(4).tolist(),head.max(0).round(4).tolist())
                # frontmost (max z) around face height 1.55-1.75
                face=head[(head[:,1]>1.52)&(head[:,1]<1.78)]
                if len(face):
                    print('   face band z max',face[:,2].max().round(4),'x range',face[:,0].min().round(4),face[:,0].max().round(4))
    print('--- clips matching ---')
    names=[a.get('name','') for a in js.get('animations',[])]
    for n in names:
        if any(k in n.lower() for k in ['idle','talk','wave','point','shrug','look','think','sit','stand','walk','run']): print(' ',n)
main(sys.argv[1])
