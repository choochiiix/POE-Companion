// Names from the user-supplied PoB archive: src/TreeData/3_29/tree.lua.
export const characterClasses = {
  Marauder: ['Juggernaut', 'Berserker', 'Chieftain'],
  Ranger: ['Warden', 'Deadeye', 'Pathfinder'],
  Witch: ['Occultist', 'Elementalist', 'Necromancer'],
  Duelist: ['Slayer', 'Gladiator', 'Champion'],
  Templar: ['Inquisitor', 'Hierophant', 'Guardian'],
  Shadow: ['Assassin', 'Trickster', 'Saboteur'],
  Scion: ['Ascendant', 'Reliquarian', 'Luminary'],
};

export function validCharacter(value) {
  const characterClass = Object.hasOwn(characterClasses, value?.characterClass)
    ? value.characterClass : 'Marauder';
  return {
    characterClass,
    ascendancy: characterClasses[characterClass].includes(value?.ascendancy)
      ? value.ascendancy : '',
  };
}

const oneHandClasses = ['Claw', 'Dagger', 'Rune Dagger', 'One Hand Axe', 'One Hand Mace',
  'One Hand Sword', 'Thrusting One Hand Sword', 'Sceptre', 'Wand'];
const weaponClasses = [...oneHandClasses, 'Bow', 'Staff', 'Warstaff',
  'Two Hand Axe', 'Two Hand Mace', 'Two Hand Sword'];
export const equipmentSlots = {
  helmet: ['Helmet'], amulet: ['Amulet'], 'main-hand': weaponClasses,
  'body-armour': ['Body Armour'], 'off-hand': [...oneHandClasses, 'Shield', 'Quiver'],
  gloves: ['Gloves'], 'ring-one': ['Ring'], belt: ['Belt'], 'ring-two': ['Ring'], boots: ['Boots'],
};

// Ordinary equipment only. Special unique-item exceptions are outside this base picker.
export function basesForSlot(bases, slot, mainHand) {
  let classes = equipmentSlots[slot] ?? [];
  if (slot === 'off-hand' && mainHand) {
    const mainClass = mainHand.itemClass;
    if (mainClass === 'Bow') classes = ['Quiver'];
    else if (!oneHandClasses.includes(mainClass)) classes = [];
    else if (mainClass === 'Wand') classes = ['Wand', 'Shield'];
    else classes = [...oneHandClasses.filter((name) => name !== 'Wand'), 'Shield'];
  }
  return bases.filter((base) => classes.includes(base.itemClass))
    .sort((a, b) => a.itemClass.localeCompare(b.itemClass) || a.name.localeCompare(b.name));
}

export function validEquipment(value, bases) {
  const result = {};
  const mainHand = bases.find((base) => base.id === value?.['main-hand'] &&
    weaponClasses.includes(base.itemClass));
  for (const slot of Object.keys(equipmentSlots)) {
    result[slot] = basesForSlot(bases, slot, mainHand).some((base) => base.id === value?.[slot])
      ? value[slot] : '';
  }
  return result;
}

const portraitAscendancies=new Set(['Ascendant','Assassin','Berserker','Champion','Chieftain','Deadeye','Elementalist','Gladiator','Guardian','Hierophant','Inquisitor','Juggernaut','Necromancer','Occultist','Pathfinder','Saboteur','Slayer','Trickster','Warden']);
export const classPortraitPath=name=>Object.hasOwn(characterClasses,name)?`/assets/classes/portrait${name.toLowerCase()}.png`:null;
export const ascendancyPortraitPath=name=>portraitAscendancies.has(name)?`/assets/ascendancies/${name==='Warden'?'':'portrait'}${name.toLowerCase()}.png`:null;
