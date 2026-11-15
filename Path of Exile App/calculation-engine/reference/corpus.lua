local file = assert(io.open(REFERENCE_DIR .. '/../corpus/cases.json', 'r'))
local cases = require('dkjson').decode(file:read('*a')); file:close()
trialResult = {cases = {}}
for _,case in ipairs(cases) do
  newBuild()
  build.characterLevel = 20
  build.spec:SelectClass(3)
  build.spec:AllocNode(build.spec.nodes[57264]); build.spec:AllocNode(build.spec.nodes[33296])
  if case.skill == 'fireball' then build.skillsTab:PasteSocketGroup('Slot: Weapon 1\nFireball '..case.gemLevel..'/0  1\nElemental Focus 1/0  1\n') end
  build.itemsTab:CreateDisplayItemFromRaw('Rarity: NORMAL\nRusted Sword\nQuality: 0\nImplicits: 1\n40% increased Global Accuracy Rating'); build.itemsTab:AddDisplayItem()
  build.itemsTab:CreateDisplayItemFromRaw('Rarity: NORMAL\nPlate Vest\nQuality: 0\nArmour: 23\nImplicits: 0'); build.itemsTab:AddDisplayItem()
  for key,value in pairs({resistancePenalty=case.penalty, enemyLevel=20, enemyIsBoss='None', enemyFireResist=case.resistance, enemyArmour=case.armour, enemyEvasion=case.evasion, customMods=table.concat(case.mods,'\n')}) do build.configTab.input[key] = value end
  build.configTab:BuildModList(); build.buildFlag=true; runCallback('OnFrame')
  assert(not launch.promptMsg, launch.promptMsg)
  local output = {}
  for _,key in ipairs({'Str','Dex','Int','Life','Mana','Armour','Evasion','EnergyShield','FireResist','ColdResist','LightningResist','ChaosResist','Speed','CritChance','CritMultiplier','HitChance','AverageHit','AverageDamage','TotalDPS','Accuracy'}) do output[key] = build.calcsTab.mainOutput[key] end
  local detail={}
  for key,value in pairs(build.calcsTab.mainOutput) do if type(value)=='number' and (key:match('Physical') or key:match('CritAverage')) then detail[key]=value end end
  detail.enemyArmour=build.calcsTab.mainEnv.enemyDB:Sum('BASE',nil,'Armour')
  detail.effectiveEnemyArmour=calcLib.val(build.calcsTab.mainEnv.enemyDB,'Armour')
  detail.hit=build.calcsTab.mainOutput.MainHand and build.calcsTab.mainOutput.MainHand.PhysicalHitAverage
  detail.crit=build.calcsTab.mainOutput.MainHand and build.calcsTab.mainOutput.MainHand.PhysicalCritAverage
  table.insert(trialResult.cases, {definition=case, output=output, detail=detail})
end
