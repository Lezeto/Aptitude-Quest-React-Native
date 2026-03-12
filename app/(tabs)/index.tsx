import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, ScrollView,
  StyleSheet, Dimensions, SafeAreaView,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Images ──────────────────────────────────────────────────────────────────
const professionImages: Record<string, any> = {
  Deportista: require('../../assets/images/game/deportista.png'),
  Abogado:    require('../../assets/images/game/abogado.png'),
  Empresario: require('../../assets/images/game/empresario.png'),
  Sacerdote:  require('../../assets/images/game/sacerdote.png'),
  Policia:    require('../../assets/images/game/policia.png'),
};

const itemImages: Record<string, any> = {
  Gem:    require('../../assets/images/game/gem.png'),
  Sword:  require('../../assets/images/game/sword.png'),
  Shield: require('../../assets/images/game/shield.png'),
  Helmet: require('../../assets/images/game/helmet.png'),
  Armor:  require('../../assets/images/game/armor.png'),
  Legs:   require('../../assets/images/game/legs.png'),
  Boots:  require('../../assets/images/game/boots.png'),
  Wand:   require('../../assets/images/game/wand.png'),
  Ring:   require('../../assets/images/game/ring.png'),
  Book:   require('../../assets/images/game/book.png'),
};

// ── Types ────────────────────────────────────────────────────────────────────
interface Difficulty {
  name: string; req: number; time: number; success: number;
  damage: number; exp: number; lootChance: number;
}
interface Mission {
  id: number; name: string; difficulty: Difficulty; reqStat: string;
}
interface Equipment { [key: string]: string | null; }
interface Character { inventory: string[]; equipment: Equipment; }

// ── Game constants ───────────────────────────────────────────────────────────
const statLabels: Record<string, string> = {
  fuerza: 'Salud', coartada: 'Carisma', activos: 'Liderazgo',
  informacion: 'Inteligencia', patrullaje: 'Suerte',
};
const professions: Record<string, string> = {
  Deportista: 'fuerza', Abogado: 'coartada', Empresario: 'activos',
  Sacerdote: 'informacion', Policia: 'patrullaje',
};
const missionTypes = ['Emprendimiento', 'Voluntariado', 'Proyecto', 'Investigación', 'Capacitación'];
const difficulties: Difficulty[] = [
  { name: 'Simple',  req: 0,  time: 5000,  success: 0.9, damage: 20, exp: 20,  lootChance: 0.3 },
  { name: 'Normal',  req: 5,  time: 8000,  success: 0.8, damage: 30, exp: 50,  lootChance: 0.4 },
  { name: 'Dificil', req: 10, time: 20000, success: 0.7, damage: 40, exp: 100, lootChance: 0.7 },
];
const itemsPool = ['Helmet','Armor','Legs','Boots','Sword','Shield','Wand','Ring','Book','Gem'];
const MAX_STAT = 30;
const MAX_HP   = 100;

// ── StatBar ──────────────────────────────────────────────────────────────────
function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(1, Math.max(0, value / max));
  return (
    <View style={barStyles.bg}>
      {pct > 0 && <View style={[barStyles.fill, { flex: pct, backgroundColor: color }]} />}
      {pct < 1 && <View style={{ flex: 1 - pct }} />}
    </View>
  );
}
const barStyles = StyleSheet.create({
  bg:   { flex: 1, height: 14, backgroundColor: '#555', borderRadius: 7, overflow: 'hidden', flexDirection: 'row' },
  fill: { height: '100%', borderRadius: 7 },
});

// ── Main Game Component ──────────────────────────────────────────────────────
export default function GameScreen() {
  const [profession, setProfession]   = useState<string | null>(null);
  const [stats, setStats]             = useState<Record<string, number>>({ fuerza: 0, coartada: 0, activos: 0, informacion: 0, patrullaje: 0 });
  const [hp, setHp]                   = useState(MAX_HP);
  const [level, setLevel]             = useState(1);
  const [exp, setExp]                 = useState(0);
  const [points, setPoints]           = useState(0);
  const [missions, setMissions]       = useState<Mission[]>([]);
  const [cooldown, setCooldown]       = useState(0);
  const [nextMissionIn, setNextMissionIn] = useState(12);
  const [message, setMessage]         = useState('');
  const [character, setCharacter]     = useState<Character>({
    inventory: [],
    equipment: { Casco: null, Armadura: null, 'Pantalón': null, Botas: null, Izquierda: null, Derecha: null },
  });
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [tickCounter, setTickCounter] = useState(0);
  const levelRef = useRef(level);
  levelRef.current = level;

  const expToNextLevel = (lvl: number): number =>
    lvl === 1 ? 100 : Math.floor(expToNextLevel(lvl - 1) * 1.6);

  const generateMissions = (n: number, currentStats = stats) => {
    const newMissions: Mission[] = [];
    for (let i = 0; i < n; i++) {
      const type    = missionTypes[Math.floor(Math.random() * missionTypes.length)];
      const diff    = difficulties[Math.floor(Math.random() * difficulties.length)];
      const statKeys = Object.keys(currentStats);
      const reqStat = statKeys[Math.floor(Math.random() * statKeys.length)];
      newMissions.push({ id: Date.now() + Math.random(), name: `${type} ${diff.name}`, difficulty: diff, reqStat });
    }
    setMissions(prev => [...prev, ...newMissions]);
  };

  const chooseProfession = (prof: string) => {
    const newStats: Record<string, number> = { fuerza: 0, coartada: 0, activos: 0, informacion: 0, patrullaje: 0 };
    newStats[professions[prof]] = 10;
    setStats(newStats);
    setProfession(prof);
    setMissions([]);
    generateMissions(5, newStats);
  };

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => setCooldown(c => Math.max(0, c - 1000)), 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // HP regeneration
  useEffect(() => {
    const interval = setInterval(() => {
      if (cooldown === 0) setHp(h => Math.min(MAX_HP, h + 5));
    }, 10000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // New mission timer
  useEffect(() => {
    if (!profession || missions.length >= 5) return;
    const interval = setInterval(() => {
      setTickCounter(t => {
        if (t >= 9) {
          setNextMissionIn(n => {
            if (n <= 1) {
              setMissions(prev => { if (prev.length < 5) generateMissions(1); return prev; });
              return 12;
            }
            return n - 1;
          });
          return 0;
        }
        return t + 1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [missions.length, profession]);

  const showTempMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 7000);
  };

  const acceptMission = (mission: Mission) => {
    if (cooldown > 0) return;
    if (stats[mission.reqStat] < mission.difficulty.req) {
      showTempMessage('No tienes suficientes stats para esta misión.');
      return;
    }
    setCooldown(mission.difficulty.time);
    setTimeout(() => {
      if (Math.random() <= mission.difficulty.success) {
        showTempMessage(`¡Éxito en la misión ${mission.name}!`);
        setExp(currentExp => {
          let newExp   = currentExp + mission.difficulty.exp;
          let newLevel = levelRef.current;
          while (newExp >= expToNextLevel(newLevel)) {
            newExp -= expToNextLevel(newLevel);
            newLevel += 1;
            setLevel(newLevel);
            setPoints(p => p + 5);
          }
          return newExp;
        });
        if (Math.random() < mission.difficulty.lootChance) {
          const newItem = itemsPool[Math.floor(Math.random() * itemsPool.length)];
          setCharacter(prev => ({ ...prev, inventory: [...prev.inventory, newItem] }));
          showTempMessage(`¡Encontraste un ${newItem}!`);
        }
      } else {
        showTempMessage(`Fallaste la misión ${mission.name}`);
        setHp(h => Math.max(0, h - mission.difficulty.damage));
      }
      setMissions(ms => ms.filter(m => m.id !== mission.id));
    }, mission.difficulty.time);
  };

  const cancelMission  = (id: number) => setMissions(ms => ms.filter(m => m.id !== id));
  const upgradeStat    = (stat: string) => {
    if (points > 0 && stats[stat] < MAX_STAT) {
      setStats(s => ({ ...s, [stat]: s[stat] + 1 }));
      setPoints(p => p - 1);
    }
  };

  const isValidSlot = (item: string, slot: string): boolean => {
    const validSlots: Record<string, string[]> = {
      Helmet: ['Casco'],    Armor: ['Armadura'], Legs: ['Pantalón'], Boots: ['Botas'],
      Sword:  ['Izquierda','Derecha'], Shield: ['Izquierda','Derecha'],
      Wand:   ['Izquierda','Derecha'], Ring:   ['Izquierda','Derecha'],
      Book:   ['Izquierda','Derecha'], Gem:    ['Izquierda','Derecha'],
    };
    return !!validSlots[item]?.includes(slot);
  };

  const equipItem = (item: string, slot: string) => {
    if (!isValidSlot(item, slot)) return;
    setCharacter(prev => {
      const currentlyEquipped = prev.equipment[slot];
      const newInventory      = [...prev.inventory];
      const idx               = newInventory.indexOf(item);
      if (idx > -1) newInventory.splice(idx, 1);
      if (currentlyEquipped) newInventory.push(currentlyEquipped);
      return { ...prev, equipment: { ...prev.equipment, [slot]: item }, inventory: newInventory };
    });
  };

  const unequipItem = (slot: string) => {
    const item = character.equipment[slot];
    if (item) setCharacter(prev => ({
      ...prev,
      equipment: { ...prev.equipment, [slot]: null },
      inventory: [...prev.inventory, item],
    }));
  };

  // Tap inventory item to select; tap equipment slot to equip/unequip
  const handleSlotPress = (slot: string) => {
    if (selectedItem && isValidSlot(selectedItem, slot)) {
      equipItem(selectedItem, slot);
      setSelectedItem(null);
    } else if (character.equipment[slot]) {
      unequipItem(slot);
    }
  };
  const handleInventoryPress = (item: string) =>
    setSelectedItem(prev => (prev === item ? null : item));

  // ── Profession Selection ─────────────────────────────────────────────────
  if (!profession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.h1}>Aptitude-Quest</Text>
          <Text style={styles.subtitle}>Elige tu profesión</Text>
          <Text style={styles.description}>
            Bienvenido a Aptitude-Quest. Simula ser una de cinco profesiones en el mundo laboral como un RPG.{'\n\n'}
            Desarrolla: Inteligencia, Carisma, Liderazgo, Suerte y Salud. Cada profesión empieza con 10 puntos en su aptitud principal.{'\n\n'}
            Acepta misiones para ganar experiencia. Falla y pierdes vida (se recupera 5 pts / 10s).{'\n\n'}
            Al subir de nivel obtienes 5 puntos para mejorar aptitudes. Objetivo: alcanzar 10 en cada una.
          </Text>
          <View style={styles.professionsGrid}>
            {Object.keys(professions).map(p => (
              <TouchableOpacity key={p} style={styles.profCard} onPress={() => chooseProfession(p)}>
                <Image source={professionImages[p]} style={styles.profImage} resizeMode="contain" />
                <Text style={styles.profName}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Game Screen ──────────────────────────────────────────────────────────
  const equipSlots: (string | null)[] = [
    null, 'Casco', null,
    'Izquierda', 'Armadura', 'Derecha',
    null, 'Pantalón', 'Botas',
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <Image source={professionImages[profession]} style={styles.profIcon} resizeMode="contain" />
          <Text style={styles.h1}>{profession}</Text>
        </View>

        {/* Stats card */}
        <View style={styles.card}>
          <View style={styles.barRow}>
            <Text style={styles.barLabel}>Vida</Text>
            <StatBar value={hp} max={MAX_HP} color="#ff4d4d" />
            <Text style={styles.barValue}>{hp}/{MAX_HP}</Text>
          </View>
          <View style={styles.barRow}>
            <Text style={styles.barLabel}>Exp</Text>
            <StatBar value={exp} max={expToNextLevel(level)} color="#9b59b6" />
            <Text style={styles.barValue}>{exp}/{expToNextLevel(level)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.infoText}>Nivel: {level}</Text>
            <Text style={styles.infoText}>Puntos disponibles: {points}</Text>
          </View>
          {Object.keys(stats).map(s => (
            <View key={s} style={styles.barRow}>
              <Text style={styles.barLabel}>{statLabels[s]}</Text>
              <StatBar value={stats[s]} max={MAX_STAT} color="#58d68d" />
              <Text style={styles.barValue}>{stats[s]}/{MAX_STAT}</Text>
              <TouchableOpacity
                style={[styles.plusBtn, points === 0 && styles.plusBtnDisabled]}
                onPress={() => upgradeStat(s)}
                disabled={points === 0}
              >
                <Text style={styles.plusBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Equipment + Inventory */}
        <View style={styles.gearRow}>
          {/* Equipment grid */}
          <View>
            <Text style={styles.h2}>Equipo</Text>
            <View style={styles.equipGrid}>
              {equipSlots.map((slot, i) =>
                slot ? (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.equipSlot,
                      selectedItem && isValidSlot(selectedItem, slot) && styles.equipSlotHighlight,
                    ]}
                    onPress={() => handleSlotPress(slot)}
                  >
                    {character.equipment[slot] ? (
                      <Image
                        source={itemImages[character.equipment[slot] as string]}
                        style={styles.slotImg}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.slotLabel}>{slot}</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View key={`e${i}`} style={styles.equipEmpty} />
                )
              )}
            </View>
          </View>

          {/* Inventory */}
          <View style={{ flex: 1 }}>
            <Text style={styles.h2}>Inventario</Text>
            {selectedItem && (
              <Text style={styles.selectHint}>✓ {selectedItem}{'\n'}Toca un slot válido</Text>
            )}
            <View style={styles.invGrid}>
              {Array.from({ length: 16 }).map((_, i) => {
                const item = character.inventory[i];
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.invSlot, item === selectedItem && styles.invSlotSelected]}
                    onPress={() => item && handleInventoryPress(item)}
                  >
                    {item && (
                      <Image source={itemImages[item]} style={styles.invImg} resizeMode="contain" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Missions */}
        <Text style={styles.h2}>Actividades</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {missions.map(m => (
            <View key={m.id} style={styles.missionCard}>
              <Text style={styles.missionName}>{m.name}</Text>
              <Text style={styles.missionText}>Req: {m.difficulty.req} {statLabels[m.reqStat] ?? m.reqStat}</Text>
              <Text style={styles.missionText}>Éxito: {m.difficulty.success * 100}%</Text>
              <Text style={styles.missionText}>Duración: {m.difficulty.time / 1000}s</Text>
              <Text style={styles.missionText}>Exp: {m.difficulty.exp}</Text>
              <TouchableOpacity
                style={[styles.missionBtn, cooldown > 0 && styles.missionBtnDisabled]}
                onPress={() => acceptMission(m)}
                disabled={cooldown > 0}
              >
                <Text style={styles.missionBtnText}>Aceptar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.missionBtnCancel} onPress={() => cancelMission(m.id)}>
                <Text style={styles.missionBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {/* Cooldown / Messages */}
        <View style={styles.card}>
          <Text style={styles.cooldownText}>Cooldown: {cooldown > 0 ? `${cooldown / 1000}s` : '0s'}</Text>
          {missions.length < 5 && (
            <Text style={styles.infoText}>
              Próx. misión en: {Math.floor(nextMissionIn / 60)}m {nextMissionIn % 60}s
            </Text>
          )}
          {message ? <Text style={styles.messageText}>{message}</Text> : null}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:        { flex: 1, backgroundColor: '#2e2e2e' },
  scrollContent:   { padding: 14, paddingBottom: 50 },
  header:          { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  profIcon:        { width: 48, height: 48, marginRight: 10 },
  h1:              { fontSize: 22, fontWeight: 'bold', color: '#e0e0e0' },
  h2:              { fontSize: 16, fontWeight: 'bold', color: '#e0e0e0', marginBottom: 6 },
  subtitle:        { fontSize: 16, color: '#bbb', textAlign: 'center', marginBottom: 8 },
  description:     { fontSize: 13, color: '#ccc', lineHeight: 20, marginHorizontal: 4, marginBottom: 20 },
  card:            { backgroundColor: '#3a3a3a', borderRadius: 10, padding: 12, marginBottom: 12 },
  row:             { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  barRow:          { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  barLabel:        { width: 80, fontSize: 11, color: '#e0e0e0', fontWeight: 'bold' },
  barValue:        { width: 50, fontSize: 10, color: '#bbb', textAlign: 'right' },
  infoText:        { fontSize: 12, color: '#e0e0e0' },
  plusBtn:         { marginLeft: 4, backgroundColor: '#555', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#e0e0e0' },
  plusBtnDisabled: { opacity: 0.4 },
  plusBtnText:     { color: '#e0e0e0', fontSize: 13 },
  // Profession selection
  professionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  profCard:        { width: (SCREEN_WIDTH - 52) / 2, backgroundColor: '#3a3a3a', borderRadius: 10, padding: 10, margin: 5, alignItems: 'center', borderWidth: 1, borderColor: '#777' },
  profImage:       { width: 80, height: 80, marginBottom: 6 },
  profName:        { color: '#e0e0e0', fontWeight: 'bold', fontSize: 14 },
  // Equipment & inventory
  gearRow:         { flexDirection: 'row', marginBottom: 10, gap: 6 },
  equipGrid:       { flexDirection: 'row', flexWrap: 'wrap', width: 3 * 54 },
  equipSlot:       { width: 50, height: 50, margin: 2, backgroundColor: '#3a3a3a', borderWidth: 1, borderColor: '#777', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  equipSlotHighlight: { borderColor: '#58d68d', borderWidth: 2 },
  equipEmpty:      { width: 50, height: 50, margin: 2 },
  slotImg:         { width: 38, height: 38 },
  slotLabel:       { fontSize: 7, color: '#999', textAlign: 'center' },
  selectHint:      { fontSize: 10, color: '#58d68d', marginBottom: 3 },
  invGrid:         { flexDirection: 'row', flexWrap: 'wrap' },
  invSlot:         { width: 35, height: 35, margin: 2, backgroundColor: '#3a3a3a', borderWidth: 1, borderColor: '#777', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  invSlotSelected: { borderColor: '#f0c040', borderWidth: 2 },
  invImg:          { width: 27, height: 27 },
  // Missions
  missionCard:        { width: 148, backgroundColor: '#3a3a3a', borderRadius: 8, padding: 10, marginRight: 10, borderWidth: 1, borderColor: '#555' },
  missionName:        { color: '#e0e0e0', fontWeight: 'bold', fontSize: 13, marginBottom: 4 },
  missionText:        { color: '#bbb', fontSize: 11, marginBottom: 2 },
  missionBtn:         { backgroundColor: '#4d4d4d', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 5, padding: 6, marginTop: 5, alignItems: 'center' },
  missionBtnDisabled: { opacity: 0.5 },
  missionBtnCancel:   { backgroundColor: '#4d4d4d', borderWidth: 1, borderColor: '#ff6b6b', borderRadius: 5, padding: 6, marginTop: 4, alignItems: 'center' },
  missionBtnText:     { color: '#e0e0e0', fontSize: 12 },
  // Cooldown
  cooldownText:  { color: '#e0e0e0', fontWeight: 'bold', fontSize: 14 },
  messageText:   { color: '#f0c040', fontSize: 13, marginTop: 4 },
});
