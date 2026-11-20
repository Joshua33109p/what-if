import React from 'react';
import * as THREE from 'three';

const glow = (color: string, opacity = 1) => (
  <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} toneMapped={false} />
);

const Window: React.FC = () => (
  <group position={[1.65, 1.55, -2.96]}>
    <mesh>
      <planeGeometry args={[2.5, 1.8]} />
      <meshBasicMaterial color="#5C86C8" />
    </mesh>
    <mesh position={[0, 0, 0.012]}>
      <planeGeometry args={[2.3, 1.6]} />
      <meshBasicMaterial color="#9CC4F2" transparent opacity={0.35} />
    </mesh>
    {[-1.25, 0, 1.25].map((x) => (
      <mesh key={`v${x}`} position={[x, 0, 0.03]}>
        <boxGeometry args={[0.05, 1.86, 0.05]} />
        <meshStandardMaterial color="#241C30" roughness={0.8} />
      </mesh>
    ))}
    {[-0.9, 0, 0.9].map((y) => (
      <mesh key={`h${y}`} position={[0, y, 0.03]}>
        <boxGeometry args={[2.56, 0.05, 0.05]} />
        <meshStandardMaterial color="#241C30" roughness={0.8} />
      </mesh>
    ))}
    <mesh position={[0, 0, -0.02]}>
      <boxGeometry args={[2.62, 1.92, 0.08]} />
      <meshStandardMaterial color="#241C30" roughness={0.85} />
    </mesh>
  </group>
);

const Shelf: React.FC<{ t: number }> = ({ t }) => {
  const rows = [0.85, 1.45, 2.05];
  const cols = [-0.45, 0, 0.45];
  return (
    <group position={[-3.35, 0, -0.7]} rotation-y={Math.PI / 2}>
      {rows.map((y) => (
        <mesh key={`board${y}`} position={[0, y, 0]}>
          <boxGeometry args={[1.35, 0.05, 0.28]} />
          <meshStandardMaterial color="#4A342A" roughness={0.8} />
        </mesh>
      ))}
      {rows.flatMap((y, ri) =>
        cols.map((x, ci) => (
          <group key={`${y}-${x}`} position={[x, y + 0.12, 0]}>
            <mesh>
              <cylinderGeometry args={[0.045, 0.055, 0.06, 12]} />
              <meshStandardMaterial color="#2A2238" roughness={0.6} metalness={0.3} />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
              <sphereGeometry args={[0.075, 16, 12]} />
              {glow(['#FFC46A', '#7CE0D3', '#C08CFF', '#FF8A7A', '#9CC4F2', '#F2B33D', '#7CE0D3', '#C08CFF', '#FFC46A'][ri * 3 + ci])}
            </mesh>

          </group>
        )),
      )}
      <mesh position={[0, 1.2, -0.18]}>
        <boxGeometry args={[1.4, 2.3, 0.06]} />
        <meshStandardMaterial color="#2A2033" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.35, 0.02]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[1.4, 0.3]} />
        {glow('#FFB067', 0.35)}
      </mesh>
      <pointLight position={[0, 1.6, 0.4]} intensity={3} distance={2.4} decay={2} color="#FFB067" />
    </group>
  );
};

export const SkillOrb: React.FC<{
  position?: [number, number, number];
  color?: string;
  radius?: number;
  t?: number;
  light?: boolean;
}> = ({ position = [0, 0, 0], color = '#FFC46A', radius = 0.11, t = 0, light = false }) => {
  const pulse = 1 + Math.sin(t * 3.2) * 0.06;
  return (
    <group position={position} scale={pulse}>
      <mesh>
        <sphereGeometry args={[radius, 20, 16]} />
        {glow(color)}
      </mesh>
      <mesh>
        <sphereGeometry args={[radius * 1.55, 16, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      {light ? <pointLight intensity={radius > 0.1 ? 5 : 2.5} distance={1.5} decay={2} color={color} /> : null}
    </group>
  );
};

const Piano: React.FC<{ t: number }> = ({ t }) => (
  <group position={[-2.15, 0, 0.65]} rotation-y={-Math.PI / 2}>
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[1.65, 1.0, 0.55]} />
      <meshStandardMaterial color="#3A2630" roughness={0.55} metalness={0.1} />
    </mesh>
    <mesh position={[0, 1.03, 0]}>
      <boxGeometry args={[1.72, 0.08, 0.62]} />
      <meshStandardMaterial color="#24161E" roughness={0.5} />
    </mesh>
    <mesh position={[0, 0.94, 0.33]}>
      <boxGeometry args={[1.34, 0.06, 0.34]} />
      <meshStandardMaterial color="#E9E2D0" roughness={0.7} />
    </mesh>
    {Array.from({ length: 18 }).map((_, i) => (
      <mesh key={`w${i}`} position={[-0.61 + i * 0.072, 0.975, 0.36]}>
        <boxGeometry args={[0.06, 0.012, 0.3]} />
        <meshStandardMaterial color="#F5EEDC" roughness={0.65} />
      </mesh>
    ))}
    {[1, 2, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16].map((i) => (
      <mesh key={`b${i}`} position={[-0.61 + i * 0.072 - 0.036, 0.99, 0.32]}>
        <boxGeometry args={[0.038, 0.02, 0.19]} />
        <meshStandardMaterial color="#1A1218" roughness={0.5} />
      </mesh>
    ))}
    <mesh position={[0, 1.35, 0.05]} rotation-x={-0.25}>
      <boxGeometry args={[0.95, 0.52, 0.03]} />
      <meshStandardMaterial color="#4E3A34" roughness={0.75} />
    </mesh>
    <mesh position={[0, 1.36, 0.075]} rotation-x={-0.25}>
      <boxGeometry args={[0.82, 0.4, 0.01]} />
      <meshStandardMaterial color="#E7DCC4" roughness={0.9} />
    </mesh>
    <SkillOrb position={[0, 1.32, 0.4]} color="#FFC46A" radius={0.1} t={t} />
    <mesh position={[0, 0.22, 0.15]}>
      <boxGeometry args={[1.3, 0.12, 0.45]} />
      <meshStandardMaterial color="#2C1C24" roughness={0.8} />
    </mesh>
    {[-0.62, 0.62].map((x) => (
      <mesh key={`leg${x}`} position={[x, 0.1, 0.15]}>
        <boxGeometry args={[0.08, 0.2, 0.38]} />
        <meshStandardMaterial color="#24161E" roughness={0.8} />
      </mesh>
    ))}
  </group>
);

const SurgeryBay: React.FC<{ t: number }> = ({ t }) => (
  <group position={[2.15, 0, 0.15]}>
    <mesh position={[0, 0.82, 0]}>
      <boxGeometry args={[1.55, 0.12, 0.72]} />
      <meshStandardMaterial color="#4A5560" roughness={0.45} metalness={0.35} />
    </mesh>
    {[-0.62, 0.62].map((x) =>
      [-0.25, 0.25].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.4, z]}>
          <boxGeometry args={[0.07, 0.8, 0.07]} />
          <meshStandardMaterial color="#2B3138" roughness={0.5} metalness={0.4} />
        </mesh>
      )),
    )}
    <mesh position={[-0.15, 0.95, 0]}>
      <boxGeometry args={[1.05, 0.14, 0.46]} />
      <meshStandardMaterial color="#B8C4C0" roughness={0.8} />
    </mesh>
    <mesh position={[-0.7, 1.0, 0]}>
      <sphereGeometry args={[0.13, 16, 12]} />
      <meshStandardMaterial color="#D6B49A" roughness={0.7} />
    </mesh>
    <mesh position={[0.12, 1.04, 0]}>
      <boxGeometry args={[0.95, 0.035, 0.5]} />
      <meshStandardMaterial color="#DCE8E4" roughness={0.9} />
    </mesh>
    <mesh position={[0.32, 1.09, 0.22]}>
      <boxGeometry args={[0.26, 0.05, 0.16]} />
      <meshStandardMaterial color="#7D8A90" roughness={0.4} metalness={0.5} />
    </mesh>
    <mesh position={[0.32, 1.12, 0.22]} rotation-z={0.3}>
      <boxGeometry args={[0.2, 0.012, 0.03]} />
      {glow('#7CE0D3')}
    </mesh>
    <group position={[0, 2.35, 0]}>
      <mesh rotation-x={Math.PI}>
        <coneGeometry args={[0.38, 0.3, 24, 1, true]} />
        <meshStandardMaterial color="#DCE8E4" roughness={0.5} emissive="#BFE9FF" emissiveIntensity={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.16, 0]}>
        <sphereGeometry args={[0.08, 16, 12]} />
        {glow('#EAF8FF')}
      </mesh>
      <pointLight position={[0, -0.25, 0]} intensity={18} distance={3.2} decay={2} color="#D8F0FF" />
    </group>
    <mesh position={[-0.8, 1.5, -0.2]}>
      <cylinderGeometry args={[0.02, 0.02, 1.4, 8]} />
      <meshStandardMaterial color="#8A969C" roughness={0.4} metalness={0.6} />
    </mesh>
    <mesh position={[-0.8, 1.55, -0.2]}>
      <sphereGeometry args={[0.11, 16, 12]} />
      <meshStandardMaterial color="#C8E4E8" roughness={0.2} transparent opacity={0.55} />
    </mesh>
    <SkillOrb position={[0.35, 1.25, 0.18]} color="#7CE0D3" radius={0.075} t={t} />
  </group>
);

const Hoop: React.FC<{ t: number; ball?: [number, number, number] }> = ({ t, ball = [0.2, 2.35, -1.15] }) => (
  <group>
    <mesh position={[0.2, 1.2, -2.9]}>
      <cylinderGeometry args={[0.06, 0.08, 2.4, 12]} />
      <meshStandardMaterial color="#3A3038" roughness={0.5} metalness={0.4} />
    </mesh>
    <mesh position={[0.2, 2.25, -2.78]}>
      <boxGeometry args={[1.3, 0.85, 0.08]} />
      <meshStandardMaterial color="#D9D4C8" roughness={0.5} transparent opacity={0.9} />
    </mesh>
    <mesh position={[0.2, 2.1, -2.73]}>
      <boxGeometry args={[0.48, 0.34, 0.02]} />
      <meshBasicMaterial color="#B84A3A" />
    </mesh>
    <mesh position={[0.2, 1.98, -2.55]} rotation-x={Math.PI / 2}>
      <torusGeometry args={[0.24, 0.025, 10, 28]} />
      <meshStandardMaterial color="#E07038" roughness={0.4} metalness={0.5} />
    </mesh>
    <mesh position={[0.2, 1.78, -2.55]}>
      <coneGeometry args={[0.24, 0.4, 16, 1, true]} />
      <meshBasicMaterial color="#E8E4D8" wireframe transparent opacity={0.55} />
    </mesh>
    <group position={ball}>
      <mesh>
        <sphereGeometry args={[0.13, 20, 16]} />
        <meshStandardMaterial color="#C85A32" roughness={0.7} />
      </mesh>
      <mesh rotation-z={Math.PI / 2}>
        <torusGeometry args={[0.13, 0.006, 6, 24]} />
        <meshBasicMaterial color="#3A1E18" />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.13, 0.006, 6, 24]} />
        <meshBasicMaterial color="#3A1E18" />
      </mesh>
    </group>
    <mesh position={[0.2, 1.95, -2.55]}>
      <sphereGeometry args={[0.3, 16, 12]} />
      <meshBasicMaterial color="#FFC46A" transparent opacity={0.06} depthWrite={false} />
    </mesh>
    <SkillOrb position={[0.2, 2.55, -2.55]} color="#FFC46A" radius={0.06} t={t} />
  </group>
);

const Chair: React.FC = () => (
  <group position={[0.55, 0, 2.12]}>
    <mesh position={[0, 0.48, 0]}>
      <boxGeometry args={[0.5, 0.07, 0.48]} />
      <meshStandardMaterial color="#3A2A2E" roughness={0.7} />
    </mesh>
    <mesh position={[0, 0.85, -0.21]}>
      <boxGeometry args={[0.5, 0.62, 0.06]} />
      <meshStandardMaterial color="#3A2A2E" roughness={0.7} />
    </mesh>
    {[-0.2, 0.2].map((x) =>
      [-0.19, 0.19].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.24, z]}>
          <boxGeometry args={[0.05, 0.48, 0.05]} />
          <meshStandardMaterial color="#24181E" roughness={0.8} />
        </mesh>
      )),
    )}
  </group>
);

const RentalDesk: React.FC<{ t: number }> = ({ t }) => {
  const progress = 0.72;
  return (
    <group>
      <mesh position={[0, 0.86, 1.55]}>
        <boxGeometry args={[2.2, 0.1, 0.68]} />
        <meshStandardMaterial color="#5A3E2E" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.55, 1.82]}>
        <boxGeometry args={[2.1, 0.55, 0.06]} />
        <meshStandardMaterial color="#3E2A20" roughness={0.85} />
      </mesh>
      {[-0.95, 0.95].map((x) =>
        [-0.05, 0.55].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.42, 1.25 + z]}>
            <boxGeometry args={[0.08, 0.84, 0.08]} />
            <meshStandardMaterial color="#3E2A20" roughness={0.8} />
          </mesh>
        )),
      )}
      <mesh position={[0, 1.0, 1.36]}>
        <boxGeometry args={[0.95, 0.05, 0.22]} />
        <meshStandardMaterial color="#2A2238" roughness={0.5} />
      </mesh>
      {[-0.6, 0, 0.6].map((x, i) => (
        <group key={x} position={[x, 1.1, 1.38]}>
          <mesh>
            <cylinderGeometry args={[0.055, 0.07, 0.05, 14]} />
            <meshStandardMaterial color="#2A2238" roughness={0.5} metalness={0.4} />
          </mesh>
          <SkillOrb
            position={[0, 0.1, 0]}
            color={['#FFC46A', '#7CE0D3', '#C08CFF'][i]}
            radius={i === 1 ? 0.11 : 0.08}
            t={t}
            light={i === 1}
          />
        </group>
      ))}
      <mesh position={[0, 1.1, 1.38]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.19, 0.008, 8, 40, Math.PI * 2 * progress]} />
        {glow('#FFC46A', 0.9)}
      </mesh>
      <mesh position={[0, 1.42, 1.7]}>
        <boxGeometry args={[1.45, 0.32, 0.04]} />
        <meshStandardMaterial color="#1C1726" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.42, 1.675]}>
        <planeGeometry args={[1.3, 0.22]} />
        {glow('#FFB067', 0.28)}
      </mesh>
      <pointLight position={[0, 1.35, 1.3]} intensity={7} distance={2.5} decay={2} color="#FFB067" />
    </group>
  );
};

const BrainHologram: React.FC<{ t: number }> = ({ t }) => (
  <group position={[0.2, 1.82, 1.08]}>
    <mesh>
      <icosahedronGeometry args={[0.34, 1]} />
      <meshBasicMaterial color="#7CE0D3" wireframe transparent opacity={0.5} />
    </mesh>
    <mesh>
      <icosahedronGeometry args={[0.3, 1]} />
      <meshBasicMaterial color="#7CE0D3" transparent opacity={0.07} depthWrite={false} />
    </mesh>
    <mesh position={[0, -0.13, -0.14]}>
      <sphereGeometry args={[0.13, 16, 12]} />
      <meshBasicMaterial color="#FFC46A" transparent opacity={0.85} />
    </mesh>
    <mesh position={[0, -0.13, -0.14]}>
      <sphereGeometry args={[0.19, 16, 12]} />
      <meshBasicMaterial color="#FFC46A" transparent opacity={0.12} depthWrite={false} />
    </mesh>
    <mesh rotation-x={Math.PI / 2}>
      <torusGeometry args={[0.48, 0.008, 8, 48]} />
      {glow('#7CE0D3', 0.55)}
    </mesh>
    <mesh rotation-y={t * 0.5}>
      <torusGeometry args={[0.42, 0.005, 6, 48]} />
      {glow('#C08CFF', 0.4)}
    </mesh>
    <pointLight intensity={6} distance={2.4} decay={2} color="#7CE0D3" />
  </group>
);

const Pendant: React.FC = () => (
  <group position={[0.2, 2.85, 0.15]}>
    <mesh position={[0, -0.2, 0]}>
      <cylinderGeometry args={[0.012, 0.012, 0.4, 8]} />
      <meshStandardMaterial color="#2A2238" roughness={0.6} />
    </mesh>
    <mesh position={[0, -0.44, 0]}>
      <coneGeometry args={[0.28, 0.26, 24, 1, true]} />
      <meshStandardMaterial color="#E8B36A" roughness={0.5} emissive="#FFB067" emissiveIntensity={0.35} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, -0.55, 0]}>
      <sphereGeometry args={[0.07, 16, 12]} />
      {glow('#FFE0A8')}
    </mesh>
    <pointLight position={[0, -0.58, 0]} intensity={14} distance={6} decay={2} color="#FFB067" />
  </group>
);

export const SkillLibrary: React.FC<{ t?: number; ball?: [number, number, number] }> = ({ t = 0, ball }) => (
  <group>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
      <planeGeometry args={[14, 14]} />
      <meshStandardMaterial color="#2A2238" roughness={0.95} />
    </mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0.35]}>
      <planeGeometry args={[4.4, 3.2]} />
      <meshStandardMaterial color="#4A2E3A" roughness={1} />
    </mesh>
    <mesh position={[0, 2.1, -3]}>
      <planeGeometry args={[14, 4.2]} />
      <meshStandardMaterial color="#342A46" roughness={0.95} />
    </mesh>
    <mesh position={[-3.5, 2.1, 0]} rotation-y={Math.PI / 2}>
      <planeGeometry args={[6, 4.2]} />
      <meshStandardMaterial color="#2E2540" roughness={0.95} />
    </mesh>
    <mesh position={[3.5, 2.1, 0]} rotation-y={-Math.PI / 2}>
      <planeGeometry args={[6, 4.2]} />
      <meshStandardMaterial color="#2E2540" roughness={0.95} />
    </mesh>
    <Window />
    <Shelf t={t} />
    <Piano t={t} />
    <SurgeryBay t={t} />
    <Hoop t={t} ball={ball} />
    <RentalDesk t={t} />
    <BrainHologram t={t} />
    <Pendant />
    <Chair />
  </group>
);

export const SkillLibraryLights: React.FC = () => (
  <>
    <color attach="background" args={['#141020']} />
    <fog attach="fog" args={['#141020', 7, 16]} />
    <ambientLight intensity={0.55} color="#B9A6D6" />
    <directionalLight position={[2.4, 3.4, 3.6]} intensity={2.7} color="#FFD2A1" />
    <directionalLight position={[-3.2, 2.6, -2.8]} intensity={1.3} color="#7FA8FF" />
    <pointLight position={[1.65, 1.55, -2.2]} intensity={12} distance={7} decay={2} color="#8DB8FF" />
  </>
);
