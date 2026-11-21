local json = require('dkjson')
local file = assert(io.open(FIXTURES_PATH, 'rb'))
local definitions = assert(json.decode(file:read('*a')))
file:close()

local damageTypes = { 'Physical', 'Lightning', 'Cold', 'Fire', 'Chaos' }
local outputKeys = {
  'Str', 'Dex', 'Int', 'Accuracy', 'HitChance', 'CritChance', 'CritMultiplier',
  'Speed', 'Time', 'AverageHit', 'AverageDamage', 'TotalDPS',
  'Life', 'Mana', 'EnergyShield', 'Armour', 'Evasion',
  'LifeReserved', 'LifeUnreserved', 'ManaReserved', 'ManaUnreserved',
  'ManaRegenRecovery', 'EnergyShieldRecharge', 'EnergyShieldRechargeDelay',
  'FireResist', 'FireResistTotal', 'FireResistOverCap', 'FireResistMax', 'ColdResist', 'LightningResist', 'ChaosResist',
  'SpellSuppressionChance', 'SpellSuppressionEffect', 'EffectiveSpellSuppressionChance',
  'totalEnemyDamageIn', 'totalTakenHit', 'TotalEHP', 'NumberOfDamagingHits', 'EHPSurvivalTime',
}
local result = {
  runtime = jit.version .. ' (' .. jit.os .. '/' .. jit.arch .. ')',
  latestTreeVersion = latestTreeVersion,
  cases = {},
}

local function equip(text)
  build.itemsTab:CreateDisplayItemFromRaw(text)
  build.itemsTab:AddDisplayItem()
end

local function numeric(value)
  return type(value) == 'number' and value == value and math.abs(value) ~= math.huge
end

for _, case in ipairs(definitions) do
  newBuild()
  build.characterLevel = case.level
  if case.treeVersion then build.spec:Init(case.treeVersion) end
  build.spec:SelectClass(case.classId)
  for _, id in ipairs(case.passives or {}) do
    local node = assert(build.spec.nodes[id], 'Missing passive ' .. id)
    build.spec:AllocNode(node)
  end
  if case.sword then
    local rarity = next(case.sword.rawStats) and 'RARE\nMeasured Blade\n' or 'NORMAL\n'
    equip('Rarity: ' .. rarity .. 'Rusted Sword\nQuality: 0\nImplicits: 1\n'
      .. case.sword.implicit .. '\n' .. table.concat(case.sword.explicit, '\n'))
  end
  if case.robe then
    equip('Rarity: NORMAL\nSimple Robe\nQuality: 0\nEnergy Shield: ' .. case.robe.baseEnergyShield .. '\nImplicits: 0')
  end
  if case.skill == 'fireball' then
    build.skillsTab:PasteSocketGroup('Slot: Weapon 1\nFireball ' .. case.gemLevel .. '/' .. case.gemQuality
      .. '  1\nElemental Focus ' .. case.supportLevel .. '/0  1\n')
  elseif case.clarityLevel then
    build.skillsTab:PasteSocketGroup('Slot: Helmet\nClarity ' .. case.clarityLevel .. '/0  1\n')
  end
  build.mainSocketGroup = 1
  build.calcsTab.input.skill_number = 1
  build.calcsTab.input.misc_buffMode = 'EFFECTIVE'
  local config = {
    resistancePenalty = case.penalty, enemyLevel = case.enemy.level, enemyIsBoss = 'None', enemyCritChance = 0,
    enemyArmour = case.enemy.armour, enemyEvasion = case.enemy.evasion,
    enemyAccuracy = case.enemy.accuracy, enemyFireResist = case.enemy.fireResistance or 0,
    enemyColdResist = 0, enemyLightningResist = 0, enemyChaosResist = 0,
    customMods = table.concat(case.mods or {}, '\n'),
    conditionEnemyFireExposure = case.enemy.fireExposure ~= nil,
  }
  if case.incoming then
    config.enemyDamageType = case.incoming.kind == 'attack' and 'Melee' or 'Spell'
    if case.incoming.hitsPerSecond then config.enemySpeed = 1000 / case.incoming.hitsPerSecond end
    for _, damageType in ipairs(damageTypes) do
      config['enemy' .. damageType .. 'Damage'] = case.incoming.damage[damageType:lower()] or 0
      config['enemy' .. damageType .. 'Pen'] = 0
    end
  end
  for key, value in pairs(config) do build.configTab.input[key] = value end
  build.configTab:BuildModList()
  build.buildFlag = true
  runCallback('OnFrame')
  assert(not launch.promptMsg, launch.promptMsg)
  local main = build.calcsTab.mainOutput
  local calcs = build.calcsTab.calcsOutput
  local offence = calcs.MainHand or calcs
  local output = {}
  for _, key in ipairs(outputKeys) do if numeric(main[key]) then output[key] = main[key] end end
  if numeric(offence.Accuracy) then output.Accuracy = offence.Accuracy end
  if numeric(offence.AverageHit) then output.AverageHit = offence.AverageHit end
  if case.enemy.fireExposure then
    output.EnemyFireResistAfterExposure = build.calcsTab.calcsEnv.enemyDB:Sum('BASE', nil, 'FireResist', 'ElementalResist')
  end
  for _, damageType in ipairs(damageTypes) do
    for _, suffix in ipairs({ 'Min', 'Max', 'HitAverage', 'CritAverage', 'EffMult' }) do
      local key = damageType .. suffix
      if numeric(offence[key]) then output[key] = offence[key] end
    end
    for _, suffix in ipairs({ 'EnemyDamage', 'TakenHit', 'MaximumHitTaken' }) do
      local key = damageType .. suffix
      if numeric(main[key]) then output[key] = main[key] end
    end
  end
  local weapon = build.calcsTab.mainEnv.player.weaponData1
  if case.sword then
    output.WeaponPhysicalMin = weapon.PhysicalMin
    output.WeaponPhysicalMax = weapon.PhysicalMax
    output.WeaponAttackRate = weapon.AttackRate
    output.WeaponCritChance = weapon.CritChance
  end
  result.cases[#result.cases + 1] = {
    id = case.id, treeVersion = build.spec.treeVersion, mode = build.calcsTab.input.misc_buffMode,
    skillPart = build.calcsTab.calcsEnv.player.mainSkill.skillPart or 1, output = output,
  }
end
return json.encode(result)
