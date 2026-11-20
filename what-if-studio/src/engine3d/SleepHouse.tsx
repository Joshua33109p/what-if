import React from 'react';
import * as THREE from 'three';

export type SleepHouseProps = {
  t?: number;
  debt?: number;
  red?: boolean;
  holo?: boolean;
  alarm?: boolean;
};

const glow = (color: string, opacity = 1) => (
  <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} toneMapped={false} />
);

const AlarmClock: React.FC<{ t: number; alarm?: boolean }> = ({ t, alarm = false }) => {
  const shake = alarm ? Math.sin(t * 22) * 0.008 : 0;
  return (
    <group position={[-2.55, 0.59, -1.72]}>
      <mesh position={[shake, 0, 0]}>
        <boxGeometry args={[0.42, 0.26, 0.18]} />
        <meshStandardMaterial color="#2B2230" roughness={0.55} metalness={0.25} />
      </mesh>
      <mesh position={[shake, 0.02, 0.1]}>
        <cylinderGeometry args={[0.1, 0.1, 0.012, 24]} />
        <meshBasicMaterial color={alarm ? '#FF6A58' : '#FFD9A0'} />
      </mesh>
      {[-0.14, 0.14].map((x) => (
        <mesh key={x} position={[x + shake, 0.15, 0]}>
          <sphereGeometry args={[0.06, 12, 10]} />
          <meshStandardMaterial color="#D9A45F" roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
      <mesh position={[shake, 0.02, 0.112]} rotation-z={t * 0.8}>
        <boxGeometry args={[0.012, 0.075, 0.004]} />
        <meshBasicMaterial color="#1A1420" />
      </mesh>
    </group>
  );
};

export const GlassClock: React.FC<{ t: number; debt?: number; red?: boolean }> = ({ t, debt = 0, red = false }) => {
  const color = red ? '#FF6A58' : '#7CE0D3';
  const fill = Math.max(0.02, Math.min(1, debt));
  return (
    <group position={[-1.75, 2.15, -2.93]}>
      <mesh>
        <torusGeometry args={[0.44, 0.026, 12, 64]} />
        <meshStandardMaterial color="#5B556B" roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.41, 48]} />
        <meshBasicMaterial color={red ? '#3A1722' : '#142A38'} transparent opacity={0.38} depthWrite={false} />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.35, 0.018, 10, 64, Math.PI * 2 * fill]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh rotation-z={t * 1.4}>
        <boxGeometry args={[0.014, 0.31, 0.008]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh rotation-z={-t * 0.22}>
        <boxGeometry args={[0.01, 0.2, 0.006]} />
        <meshBasicMaterial color="#F2D7A8" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <sphereGeometry args={[0.045, 14, 12]} />
        {glow(color)}
      </mesh>
      <pointLight intensity={2 + fill * 5} distance={2.6} decay={2} color={color} />
    </group>
  );
};

const Window: React.FC<{ t: number; red?: boolean }> = ({ t, red = false }) => (
  <group position={[1.45, 1.72, -2.96]}>
    <mesh position={[0, 0, -0.03]}>
      <boxGeometry args={[2.3, 1.75, 0.08]} />
      <meshStandardMaterial color="#241C30" roughness={0.85} />
    </mesh>
    <mesh>
      <planeGeometry args={[2.12, 1.58]} />
      <meshBasicMaterial color={red ? '#3B1C2C' : '#0B1730'} />
    </mesh>
    <mesh position={[0.68, 0.4, 0.012]}>
      <circleGeometry args={[0.18, 28]} />
      {glow(red ? '#FF8A7A' : '#DCE8FF', 0.9)}
    </mesh>
    {Array.from({ length: 13 }).map((_, i) => {
      const x = -0.95 + (i % 7) * 0.31;
      const y = -0.7 + Math.floor(i / 7) * 0.3;
      return (
        <mesh key={i} position={[x, y, 0.014]}>
          <planeGeometry args={[0.13, 0.16]} />
          {glow(red ? '#8E4250' : '#F2C46A', 0.16 + ((i * 37) % 5) * 0.1)}
        </mesh>
      );
    })}
    {[-1.06, 0, 1.06].map((x) => (
      <mesh key={x} position={[x, 0, 0.04]}>
        <boxGeometry args={[0.045, 1.7, 0.06]} />
        <meshStandardMaterial color="#241C30" roughness={0.8} />
      </mesh>
    ))}
    {[-0.78, 0, 0.78].map((y) => (
      <mesh key={y} position={[0, y, 0.04]}>
        <boxGeometry args={[2.18, 0.045, 0.06]} />
        <meshStandardMaterial color="#241C30" roughness={0.8} />
      </mesh>
    ))}
    <mesh position={[-0.92, -0.72, 0.06]}>
      <sphereGeometry args={[0.045, 12, 10]} />
      {glow(red ? '#FF5A4E' : '#FFB067', 0.65 + Math.sin(t * 2) * 0.1)}
    </mesh>
  </group>
);

const Bed: React.FC = () => (
  <group position={[-1.75, 0, -1.15]}>
    <mesh position={[0, 0.28, 0]}>
      <boxGeometry args={[1.55, 0.18, 2.15]} />
      <meshStandardMaterial color="#3E2A34" roughness={0.85} />
    </mesh>
    <mesh position={[0, 0.43, 0]}>
      <boxGeometry args={[1.45, 0.18, 2.0]} />
      <meshStandardMaterial color="#C8B9A8" roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.55, -0.68]}>
      <boxGeometry args={[1.1, 0.16, 0.42]} />
      <meshStandardMaterial color="#F0E5D2" roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.54, 0.32]}>
      <boxGeometry args={[1.42, 0.13, 1.25]} />
      <meshStandardMaterial color="#6E4258" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.62, -1.02]}>
      <boxGeometry args={[1.6, 0.66, 0.1]} />
      <meshStandardMaterial color="#4A3038" roughness={0.8} />
    </mesh>
    {[-0.72, 0.72].map((x) => (
      <mesh key={x} position={[x, 0.14, 0]}>
        <boxGeometry args={[0.09, 0.28, 2.2]} />
        <meshStandardMaterial color="#2E2028" roughness={0.85} />
      </mesh>
    ))}
  </group>
);

const Nightstand: React.FC<{ t: number }> = ({ t }) => (
  <group position={[-2.58, 0, -1.72]}>
    <mesh position={[0, 0.3, 0]}>
      <boxGeometry args={[0.52, 0.6, 0.46]} />
      <meshStandardMaterial color="#4A342A" roughness={0.85} />
    </mesh>
    <mesh position={[0, 0.62, 0]}>
      <boxGeometry args={[0.58, 0.05, 0.5]} />
      <meshStandardMaterial color="#5A4030" roughness={0.8} />
    </mesh>
    <mesh position={[0.16, 0.88, -0.1]} rotation-z={-0.22}>
      <cylinderGeometry args={[0.06, 0.14, 0.28, 16, 1, true]} />
      <meshStandardMaterial color="#E8B36A" emissive="#FFB067" emissiveIntensity={0.35} side={THREE.DoubleSide} />
    </mesh>
    <pointLight position={[0.16, 0.72, -0.1]} intensity={5} distance={2.4} decay={2} color="#FFB067" />
    <mesh position={[0, 0.68 + Math.sin(t * 0.6) * 0.002, 0.12]}>
      <sphereGeometry args={[0.04, 12, 10]} />
      {glow('#FFE0A8')}
    </mesh>
  </group>
);

const Desk: React.FC<{ t: number }> = ({ t }) => (
  <group position={[1.62, 0, 0.05]}>
    <mesh position={[0, 0.78, 0]}>
      <boxGeometry args={[1.65, 0.09, 0.78]} />
      <meshStandardMaterial color="#5A3E2E" roughness={0.75} />
    </mesh>
    {[-0.7, 0.7].map((x) =>
      [-0.28, 0.28].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.37, z]}>
          <boxGeometry args={[0.08, 0.74, 0.08]} />
          <meshStandardMaterial color="#3E2A20" roughness={0.85} />
        </mesh>
      )),
    )}
    <mesh position={[0, 0.87, -0.05]} rotation-x={-1.05}>
      <boxGeometry args={[0.72, 0.48, 0.035]} />
      <meshStandardMaterial color="#1F2838" roughness={0.45} metalness={0.3} />
    </mesh>
    <mesh position={[0, 0.87, -0.03]} rotation-x={-1.05}>
      <planeGeometry args={[0.64, 0.4]} />
      {glow('#7FC9D8', 0.3 + Math.sin(t * 1.7) * 0.05)}
    </mesh>
    <mesh position={[-0.55, 0.85, 0.18]} rotation-y={0.2}>
      <boxGeometry args={[0.36, 0.02, 0.25]} />
      <meshStandardMaterial color="#E9DFC9" roughness={0.9} />
    </mesh>
    <mesh position={[0.58, 0.88, 0.2]}>
      <cylinderGeometry args={[0.07, 0.06, 0.16, 16]} />
      <meshStandardMaterial color="#D9D4C8" roughness={0.7} />
    </mesh>
    <mesh position={[0.62, 1.22, -0.22]} rotation-z={0.35}>
      <cylinderGeometry args={[0.05, 0.13, 0.24, 16, 1, true]} />
      <meshStandardMaterial color="#E8B36A" emissive="#FFB067" emissiveIntensity={0.3} side={THREE.DoubleSide} />
    </mesh>
    <pointLight position={[0.62, 1.05, -0.22]} intensity={6} distance={2.6} decay={2} color="#FFB067" />
  </group>
);

const FamilyTable: React.FC = () => (
  <group position={[0.1, 0, 1.78]}>
    <mesh position={[0, 0.72, 0]}>
      <boxGeometry args={[2.1, 0.09, 1.0]} />
      <meshStandardMaterial color="#5A3E2E" roughness={0.8} />
    </mesh>
    {[-0.88, 0.88].map((x) =>
      [-0.38, 0.38].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.35, z]}>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
          <meshStandardMaterial color="#3E2A20" roughness={0.85} />
        </mesh>
      )),
    )}
    {[-0.62, 0.62].map((x) => (
      <group key={x} position={[x, 0, 0.95]}>
        <mesh position={[0, 0.46, 0]}>
          <boxGeometry args={[0.5, 0.07, 0.46]} />
          <meshStandardMaterial color="#3A2A2E" roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.76, 0.2]}>
          <boxGeometry args={[0.5, 0.58, 0.06]} />
          <meshStandardMaterial color="#3A2A2E" roughness={0.75} />
        </mesh>
        {[-0.2, 0.2].map((lx) =>
          [-0.18, 0.18].map((lz) => (
            <mesh key={`${lx}-${lz}`} position={[lx, 0.23, lz]}>
              <boxGeometry args={[0.05, 0.46, 0.05]} />
              <meshStandardMaterial color="#24181E" roughness={0.85} />
            </mesh>
          )),
        )}
      </group>
    ))}
    <mesh position={[-0.25, 0.79, -0.1]}>
      <boxGeometry args={[0.45, 0.02, 0.32]} />
      <meshStandardMaterial color="#E9DFC9" roughness={0.9} />
    </mesh>
    <mesh position={[0.42, 0.83, 0.05]}>
      <cylinderGeometry args={[0.07, 0.06, 0.16, 16]} />
      <meshStandardMaterial color="#D9D4C8" roughness={0.7} />
    </mesh>
    <mesh position={[0.62, 0.79, -0.16]} rotation-y={0.4}>
      <boxGeometry args={[0.22, 0.015, 0.14]} />
      <meshStandardMaterial color="#C9A34F" roughness={0.4} metalness={0.6} />
    </mesh>
  </group>
);

const Doorway: React.FC = () => (
  <group position={[-3.38, 1.2, 0.7]} rotation-y={Math.PI / 2}>
    <mesh>
      <planeGeometry args={[1.1, 2.4]} />
      <meshBasicMaterial color="#0B0A12" />
    </mesh>
    {[-0.58, 0.58].map((x) => (
      <mesh key={x} position={[x, 0, 0.03]}>
        <boxGeometry args={[0.08, 2.5, 0.1]} />
        <meshStandardMaterial color="#2E2540" roughness={0.85} />
      </mesh>
    ))}
    <mesh position={[0, 1.25, 0.03]}>
      <boxGeometry args={[1.24, 0.08, 0.1]} />
      <meshStandardMaterial color="#2E2540" roughness={0.85} />
    </mesh>
    <mesh position={[0, 0.1, 0.05]}>
      <planeGeometry args={[1.0, 2.2]} />
      {glow('#FFD7A0', 0.12)}
    </mesh>
    <pointLight position={[0, 0.3, 0.4]} intensity={4} distance={3.2} decay={2} color="#FFD7A0" />
  </group>
);

const ClinicBoard: React.FC<{ t: number; red?: boolean }> = ({ t, red = false }) => (
  <group position={[2.55, 1.55, -0.35]} rotation-y={-Math.PI / 2}>
    <mesh>
      <boxGeometry args={[1.15, 0.78, 0.05]} />
      <meshStandardMaterial color="#202A34" roughness={0.7} metalness={0.2} />
    </mesh>
    <mesh position={[0, 0, 0.035]}>
      <planeGeometry args={[1.0, 0.62]} />
      <meshBasicMaterial color="#E9DFC9" />
    </mesh>
    {[-0.2, 0, 0.2].map((y, i) => (
      <mesh key={y} position={[-0.12, y, 0.04]}>
        <planeGeometry args={[0.54 - i * 0.08, 0.025]} />
        <meshBasicMaterial color="#5A5560" />
      </mesh>
    ))}
    <mesh position={[0.34, -0.02 + Math.sin(t * 0.8) * 0.006, 0.05]} rotation-z={0.2}>
      <boxGeometry args={[0.03, 0.42, 0.02]} />
      <meshBasicMaterial color={red ? '#FF5A4E' : '#C45A3A'} />
    </mesh>
    <pointLight position={[0, 0.2, 0.4]} intensity={3} distance={2.2} decay={2} color={red ? '#FF8A7A' : '#DCE8FF'} />
  </group>
);

const Hologram: React.FC<{ t: number; red?: boolean }> = ({ t, red = false }) => (
  <group position={[0.2, 1.72, 0.5]}>
    <mesh rotation-y={t * 0.35}>
      <icosahedronGeometry args={[0.34, 1]} />
      <meshBasicMaterial color={red ? '#FF8A7A' : '#7CE0D3'} wireframe transparent opacity={0.55} />
    </mesh>
    <mesh>
      <icosahedronGeometry args={[0.3, 1]} />
      <meshBasicMaterial color={red ? '#FF5A4E' : '#7CE0D3'} transparent opacity={0.07} depthWrite={false} />
    </mesh>
    <mesh position={[0, -0.24, -0.12]}>
      <sphereGeometry args={[0.11, 16, 12]} />
      {glow(red ? '#FF6A58' : '#FFC46A', 0.85)}
    </mesh>
    <mesh rotation-x={Math.PI / 2}>
      <torusGeometry args={[0.48, 0.008, 8, 48]} />
      {glow(red ? '#FF6A58' : '#7CE0D3', 0.55)}
    </mesh>
    <pointLight intensity={5} distance={2.4} decay={2} color={red ? '#FF6A58' : '#7CE0D3'} />
  </group>
);

const Step: React.FC = () => (
  <group position={[-0.95, 0, 2.85]}>
    <mesh position={[0, 0.09, 0]}>
      <boxGeometry args={[0.85, 0.18, 0.42]} />
      <meshStandardMaterial color="#4A342A" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.19, 0]}>
      <boxGeometry args={[0.88, 0.02, 0.45]} />
      <meshStandardMaterial color="#5A4030" roughness={0.85} />
    </mesh>
  </group>
);

export const SleepHouse: React.FC<SleepHouseProps> = ({ t = 0, debt = 0, red = false, holo = false, alarm = false }) => (
  <group>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
      <planeGeometry args={[14, 14]} />
      <meshStandardMaterial color="#2A2238" roughness={0.95} />
    </mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, 0.2]}>
      <planeGeometry args={[4.8, 4.2]} />
      <meshStandardMaterial color="#4A2E3A" roughness={1} />
    </mesh>
    <mesh position={[0, 2.1, -3]}>
      <planeGeometry args={[14, 4.2]} />
      <meshStandardMaterial color={red ? '#3A2234' : '#342A46'} roughness={0.95} />
    </mesh>
    <mesh position={[-3.5, 2.1, 0]} rotation-y={Math.PI / 2}>
      <planeGeometry args={[6, 4.2]} />
      <meshStandardMaterial color="#2E2540" roughness={0.95} />
    </mesh>
    <mesh position={[3.5, 2.1, 0]} rotation-y={-Math.PI / 2}>
      <planeGeometry args={[6, 4.2]} />
      <meshStandardMaterial color="#2E2540" roughness={0.95} />
    </mesh>
    <Window t={t} red={red} />
    <Bed />
    <Nightstand t={t} />
    <AlarmClock t={t} alarm={alarm} />
    <GlassClock t={t} debt={debt} red={red} />
    <Desk t={t} />
    <FamilyTable />
    <Doorway />
    <ClinicBoard t={t} red={red} />
    <Step />
    {holo ? <Hologram t={t} red={red} /> : null}
  </group>
);

export const SleepHouseLights: React.FC<{ red?: boolean }> = ({ red = false }) => (
  <>
    <color attach="background" args={[red ? '#24101C' : '#141020']} />
    <fog attach="fog" args={[red ? '#24101C' : '#141020', 7, 16]} />
    <ambientLight intensity={0.42} color="#B9A6D6" />
    <directionalLight position={[1.4, 3.6, -3.2]} intensity={1.5} color={red ? '#FF8A7A' : '#7FA8FF'} />
    <directionalLight position={[2.8, 3.0, 3.4]} intensity={1.9} color="#FFD2A1" />
    <pointLight position={[1.45, 1.7, -2.1]} intensity={8} distance={6} decay={2} color={red ? '#FF8A7A' : '#8DB8FF'} />
  </>
);
