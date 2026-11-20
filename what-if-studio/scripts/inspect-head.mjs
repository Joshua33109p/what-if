import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const file = process.argv[2] || 'public/models/human_male.glb';
const buf = fs.readFileSync(file);
const loader = new GLTFLoader();
loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', (gltf) => {
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  console.log('=== nodes ===');
  root.traverse((o) => {
    if (o.isBone) {
      const p = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
      if (/Head|neck|spine|eye|jaw|mouth/i.test(o.name)) console.log('BONE', o.name, 'world', p.toArray().map(v=>+v.toFixed(4)));
    }
  });
  console.log('=== meshes ===');
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    const box = new THREE.Box3().setFromObject(o);
    console.log('MESH', o.name, 'mat', mat?.name, 'skinned', !!o.isSkinnedMesh, 'worldBox', box.min.toArray().map(v=>+v.toFixed(3)), box.max.toArray().map(v=>+v.toFixed(3)));
    if (o.isMesh && o.geometry?.attributes?.position) {
      const pos = o.geometry.attributes.position;
      let ymin=Infinity,ymax=-Infinity,zmin=Infinity,zmax=-Infinity,xmin=Infinity,xmax=-Infinity;
      const v = new THREE.Vector3();
      const ys=[];
      for (let i=0;i<pos.count;i++) {
        v.fromBufferAttribute(pos,i); o.localToWorld(v);
        ys.push(v.y);
        if (v.y>1.45) { ymin=Math.min(ymin,v.y); ymax=Math.max(ymax,v.y); zmin=Math.min(zmin,v.z); zmax=Math.max(zmax,v.z); xmin=Math.min(xmin,v.x); xmax=Math.max(xmax,v.x); }
      }
      ys.sort((a,b)=>a-b);
      console.log('  verts',pos.count,'y p50/p90/p99/max',[0.5,0.9,0.99,1].map(q=>+ys[Math.min(ys.length-1,Math.floor(q*(ys.length-1)))].toFixed(3)));
      if (ymax>-Infinity) console.log('  head-ish verts y>1.45 box x',[+xmin.toFixed(3),+xmax.toFixed(3)],'y',[+ymin.toFixed(3),+ymax.toFixed(3)],'z',[+zmin.toFixed(3),+zmax.toFixed(3)]);
    }
  });
  console.log('=== animations ===', gltf.animations.length);
  console.log(gltf.animations.map(a=>a.name).filter(n=>/idle|talk|wave|point|shrug|look|think|sit|stand|walk|run/i.test(n)).slice(0,40).join('\n'));
}, (e) => { console.error(e); process.exit(1); });
