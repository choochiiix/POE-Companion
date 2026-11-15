newBuild()
build.characterLevel = 20
build.spec:SelectClass(3)
build.spec:AllocNode(build.spec.nodes[57264])
build.spec:AllocNode(build.spec.nodes[33296])
build.skillsTab:PasteSocketGroup('Slot: Weapon 1\nFireball 1/0  1\nElemental Focus 1/0  1\n')
build.itemsTab:CreateDisplayItemFromRaw('Rarity: NORMAL\nRusted Sword\nQuality: 0\nImplicits: 1\n40% increased Global Accuracy Rating')
build.itemsTab:AddDisplayItem()
build.itemsTab:CreateDisplayItemFromRaw('Rarity: NORMAL\nPlate Vest\nQuality: 0\nArmour: 23\nImplicits: 0')
build.itemsTab:AddDisplayItem()
build.configTab.input.resistancePenalty = 0
build.configTab.input.enemyLevel = 20
build.configTab.input.enemyIsBoss = 'None'
build.configTab.input.enemyFireResist = 0
build.configTab:BuildModList()
build.buildFlag = true
runCallback('OnFrame')
assert(not launch.promptMsg, launch.promptMsg)
local env = build.calcsTab.mainEnv
local out = build.calcsTab.mainOutput
local output = {}
for _, key in ipairs({'Str','Dex','Int','Life','Mana','Armour','Evasion','EnergyShield','FireResist','ColdResist','LightningResist','ChaosResist','FireMin','FireMax','FireMinBase','FireMaxBase','Speed','CritChance','CritMultiplier','HitChance','AverageHit','AverageDamage','TotalDPS','IgniteDPS'}) do output[key] = out[key] end
local fireball = data.skills.Fireball
local support = data.skills.SupportElementalFocus
local enemy = {}
for _, key in ipairs({'Armour','Evasion','Accuracy','FireResist','ColdResist','LightningResist','ChaosResist'}) do enemy[key] = env.enemyDB:Sum('BASE', nil, key) end
local constants = {}
for _,key in ipairs({'life_per_level','mana_per_level','base_evasion_rating','accuracy_rating_per_level'}) do constants[key]=data.characterConstants[key] end
trialResult = { output = output, constants = constants,
  enemy = enemy,
  modifiers = { spellIncreased = env.player.mainSkill.skillModList:Sum('INC', env.player.mainSkill.skillCfg, 'Damage'),
    elementalMore = env.player.mainSkill.skillModList:More(env.player.mainSkill.skillCfg, 'ElementalDamage') },
  skill = {name=fireball.name, castTime=fireball.castTime, stats=fireball.stats, level=fireball.levels[1]},
  support = {name=support.name, stats=support.stats, level=support.levels[1]},
  allocated = {}, weapon = env.player.weaponData1, items = {} }
trialResult.hit = {FireHitAverage=out.FireHitAverage, FireCritAverage=out.FireCritAverage}
for id, node in pairs(build.spec.allocNodes) do table.insert(trialResult.allocated, {id=id, name=node.dn, stats=node.sd}) end
for slot,item in pairs(env.player.itemList) do trialResult.items[slot] = {name=item.name, armourData=item.armourData} end
