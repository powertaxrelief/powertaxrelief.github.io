$('.stat').bind('input', function()
    {
      var inputName = $(this).attr('name')
      var mod = parseInt($(this).val()) - 10
      
      if (mod % 2 == 0)
        mod = mod / 2
      else
        mod = (mod - 1) / 2
  
      if (isNaN(mod))
        mod = ""
      else if (mod >= 0)
        mod = "+" + mod
  
      var scoreName = inputName.slice(0, inputName.indexOf("score"))
      var modName = scoreName + "mod"
      
      $("[name='" + modName + "']").val(mod)
    })

$('.statmod').bind('change', function()
{
  var name = $(this).attr('name')
  name = "uses" + name.slice(0, name.indexOf('mod'))
  
})

function updateProficiencyBonus()
{
  var level1 = parseInt($("[name='level1']").val(), 10) || 0
  var level2 = parseInt($("[name='level2']").val(), 10) || 0
  var total = level1 + level2
  var prof = ""
  if (total > 0)
    prof = "+" + (2 + Math.trunc((total - 1) / 4))
  $("[name='proficiencybonus']").val(prof)
}

// ---- Spells available (Class/Level + Multiclass fields) ----
// Data pulled from data/classes.json (PHB class tables). Multiclass slots
// follow the standard multiclass spellcaster table; Warlock Pact Magic is
// never blended into that table and is added on top of it, per the rules.
var classesData = null

var FULL_CASTERS = ["Bard", "Cleric", "Druid", "Sorcerer", "Wizard"]
var HALF_CASTERS = ["Paladin", "Ranger"]
var SLOT_COLUMNS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"]

// Prepared casters (PHB): spells prepared is a formula, not a table lookup —
// ability modifier + class level (Paladin uses half level, rounded down).
// Cleric p.58, Druid p.66, Paladin p.85, Wizard p.114.
var PREPARED_CASTER_ABILITY = { Cleric: "Wisdom", Druid: "Wisdom", Paladin: "Charisma", Wizard: "Intelligence" }

function abilityModifier(abilityName)
{
  var score = parseInt($("[name='" + abilityName + "score']").val(), 10)
  return isNaN(score) ? 0 : Math.floor((score - 10) / 2)
}

function preparedValue(className, level)
{
  var ability = PREPARED_CASTER_ABILITY[className]
  if (!ability || level < 1) return null
  var levelPart = className === "Paladin" ? Math.floor(level / 2) : level
  if (levelPart < 1) return null
  return Math.max(1, abilityModifier(ability) + levelPart)
}

// PHB Multiclass Spellcaster table, indexed by effective caster level (1-20).
var MULTICLASS_SLOTS = [
  null,
  [2,0,0,0,0,0,0,0,0], [3,0,0,0,0,0,0,0,0], [4,2,0,0,0,0,0,0,0], [4,3,0,0,0,0,0,0,0],
  [4,3,2,0,0,0,0,0,0], [4,3,3,0,0,0,0,0,0], [4,3,3,1,0,0,0,0,0], [4,3,3,2,0,0,0,0,0],
  [4,3,3,3,1,0,0,0,0], [4,3,3,3,2,0,0,0,0], [4,3,3,3,2,1,0,0,0], [4,3,3,3,2,1,0,0,0],
  [4,3,3,3,2,1,1,0,0], [4,3,3,3,2,1,1,0,0], [4,3,3,3,2,1,1,1,0], [4,3,3,3,2,1,1,1,0],
  [4,3,3,3,2,1,1,1,1], [4,3,3,3,3,1,1,1,1], [4,3,3,3,3,2,1,1,1], [4,3,3,3,3,2,2,1,1]
]

function loadClassesData()
{
  fetch('data/classes.json')
    .then(function(res) { return res.json() })
    .then(function(json) {
      classesData = json
      updateSpellsAvailable()
    })
    .catch(function(err) { console.error('Could not load data/classes.json:', err) })
}

// Canonical class names, independent of data/classes.json so class/level
// resolution (and the formula-based Spells Prepared column) keeps working
// even if that fetch fails or hasn't finished loading yet.
var ALL_CLASSES = ["Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard"]

function resolveClassName(input)
{
  if (!input) return null
  var target = input.trim().toLowerCase()
  for (var i = 0; i < ALL_CLASSES.length; i++) {
    if (ALL_CLASSES[i].toLowerCase() === target) return ALL_CLASSES[i]
  }
  return null
}

function classRow(className, level)
{
  if (!classesData || !classesData[className] || level < 1) return null
  var cf = classesData[className]["Class Features"]
  var table = cf && cf["The " + className] && cf["The " + className].table
  if (!table) return null
  var row = {}
  for (var col in table) {
    row[col] = table[col][level - 1]
  }
  return row
}

function cellNumber(value)
{
  var n = parseInt(value, 10)
  return isNaN(n) ? 0 : n
}

function knownValue(className, level, column)
{
  var row = classRow(className, level)
  if (!row || !(column in row) || row[column] === "-") return null
  return cellNumber(row[column])
}

function warlockSlots(level)
{
  var slots = [0,0,0,0,0,0,0,0,0]
  var row = classRow("Warlock", level)
  if (!row) return slots
  var count = cellNumber(row["Spell Slots"])
  var slotLevel = cellNumber(row["Slot Level"])
  if (slotLevel >= 1 && slotLevel <= 9) slots[slotLevel - 1] = count
  return slots
}

function singleClassSlots(className, level)
{
  if (className === "Warlock") return warlockSlots(level)
  var row = classRow(className, level)
  if (!row) return [0,0,0,0,0,0,0,0,0]
  return SLOT_COLUMNS.map(function(col) { return cellNumber(row[col]) })
}

// ---- Subclass-granted bonus spells (always prepared, don't count against
// Spells Known/Prepared) ----
// Only classes/subclasses with a PHB spell table already in classes.json:
// Cleric Divine Domain (58-63), Paladin Sacred Oath (86-92), Druid Circle
// of the Land (68-69, by terrain). Warlock patrons don't grant automatic
// spells in the core PHB (that's a Xanathar's-only mechanic), so Warlock
// is intentionally not included.
var SUBCLASS_CHOICES = {
  Cleric: ["Knowledge", "Life", "Light", "Nature", "Tempest", "Trickery", "War"],
  Paladin: ["Devotion", "the Ancients", "Vengeance"],
  Druid: ["Arctic", "Coast", "Desert", "Forest", "Grassland", "Mountain", "Swamp"]
}

function updateSubclassOptions()
{
  var class1 = resolveClassName($("[name='class1']").val())
  var class2 = resolveClassName($("[name='class2']").val())
  ;[{ slot: 1, className: class1 }, { slot: 2, className: class2 }].forEach(function(entry) {
    var wrap = $("#subclass" + entry.slot + "wrap")
    var label = $("#subclass" + entry.slot + "label")
    var select = $("[name='subclass" + entry.slot + "']")
    var choices = SUBCLASS_CHOICES[entry.className]
    if (!choices) {
      wrap.css("display", "none")
      return
    }
    if (select.data("builtFor") !== entry.className) {
      var current = select.val()
      var options = "<option value=''>-- select --</option>" + choices.map(function(c) {
        return "<option value='" + c + "'>" + c + "</option>"
      }).join("")
      select.html(options)
      select.data("builtFor", entry.className)
      select.val(current && choices.indexOf(current) !== -1 ? current : "")
      var labelText = entry.className === "Cleric" ? "Divine Domain"
        : entry.className === "Paladin" ? "Sacred Oath"
        : "Circle of the Land Terrain"
      label.text((entry.slot === 2 ? "Multiclass " : "") + labelText)
    }
    wrap.css("display", "")
  })
}

// Returns the raw PHB table {levelKey: [...], spellsKey: [...]} for a given
// class + subclass choice, or null if unsupported/not selected.
function subclassSpellTable(className, choice)
{
  if (!classesData || !choice) return null
  if (className === "Cleric") {
    var domainKey = choice + " Domain"
    var d = classesData.Cleric && classesData.Cleric["Class Features"][domainKey]
    return (d && d[domainKey + " Spells"] && d[domainKey + " Spells"].table) || null
  }
  if (className === "Paladin") {
    var oathKey = "Oath of " + choice
    var o = classesData.Paladin && classesData.Paladin["Sacred Oaths"][oathKey]
    return (o && o["Oath Spells"] && o["Oath Spells"][oathKey + " Spells"] && o["Oath Spells"][oathKey + " Spells"].table) || null
  }
  if (className === "Druid") {
    var land = classesData.Druid && classesData.Druid["Class Features"]["Circle of the Land"]
    var c = land && land["Circle Spells"] && land["Circle Spells"][choice]
    return (c && c.table) || null
  }
  return null
}

// All spell names granted so far (cumulative across thresholds ≤ level),
// deduped and in table order.
function subclassBonusSpells(className, choice, level)
{
  var table = subclassSpellTable(className, choice)
  if (!table) return []
  var keys = Object.keys(table)
  var levels = table[keys[0]]
  var spellLists = table[keys[1]]
  var names = []
  for (var i = 0; i < levels.length; i++) {
    if (level >= parseInt(levels[i], 10)) {
      spellLists[i].split(",").forEach(function(n) {
        var trimmed = n.trim()
        if (names.indexOf(trimmed) === -1) names.push(trimmed)
      })
    }
  }
  return names
}

// Row data for a bonus spell — pre-filled from data/spells.js, always
// prepared per PHB ("you always have it prepared... doesn't count against
// the number of spells you can prepare each day").
function bonusSpellRowData(name)
{
  var spell = SPELLS_BY_NAME[name.toLowerCase()]
  return {
    prep: true,
    name: spell ? spell.Name : name,
    level: spell ? spell["Level"] : "",
    attacksave: "",
    time: spell ? spell["Casting Time"] : "",
    range: spell ? spell["Range"] : "",
    duration: spell ? spell["Duration"] : ""
  }
}

function updateSpellsAvailable()
{
  updateSubclassOptions()

  var class1 = resolveClassName($("[name='class1']").val())
  var level1 = parseInt($("[name='level1']").val(), 10) || 0
  var class2 = resolveClassName($("[name='class2']").val())
  var level2 = parseInt($("[name='level2']").val(), 10) || 0

  var classes = []
  if (class1 && level1 > 0) classes.push({ name: class1, level: level1 })
  if (class2 && level2 > 0) classes.push({ name: class2, level: level2 })

  var slots = [0,0,0,0,0,0,0,0,0]
  var cantrips = null
  var known = null
  var prepared = null

  if (classes.length === 1) {
    slots = singleClassSlots(classes[0].name, classes[0].level)
    cantrips = knownValue(classes[0].name, classes[0].level, "Cantrips Known")
    known = knownValue(classes[0].name, classes[0].level, "Spells Known")
    prepared = preparedValue(classes[0].name, classes[0].level)
  } else if (classes.length === 2) {
    var effectiveLevel = 0
    var hasEffective = false

    var accumulators = [
      { field: "cantrips", lookup: function(c) { return knownValue(c.name, c.level, "Cantrips Known") } },
      { field: "known", lookup: function(c) { return knownValue(c.name, c.level, "Spells Known") } },
      { field: "prepared", lookup: function(c) { return preparedValue(c.name, c.level) } }
    ]
    var totals = {}
    accumulators.forEach(function(a) { totals[a.field] = { total: 0, found: false } })

    classes.forEach(function(c) {
      if (FULL_CASTERS.indexOf(c.name) !== -1) {
        effectiveLevel += c.level
        hasEffective = true
      } else if (HALF_CASTERS.indexOf(c.name) !== -1) {
        effectiveLevel += Math.floor(c.level / 2)
        hasEffective = true
      } else if (c.name === "Warlock") {
        var w = warlockSlots(c.level)
        slots = slots.map(function(v, i) { return v + w[i] })
      }

      accumulators.forEach(function(a) {
        var value = a.lookup(c)
        if (value !== null) {
          totals[a.field].total += value
          totals[a.field].found = true
        }
      })
    })

    if (hasEffective && effectiveLevel >= 1) {
      var row = MULTICLASS_SLOTS[Math.min(effectiveLevel, 20)]
      slots = slots.map(function(v, i) { return v + row[i] })
    }

    cantrips = totals.cantrips.found ? totals.cantrips.total : null
    known = totals.known.found ? totals.known.total : null
    prepared = totals.prepared.found ? totals.prepared.total : null
  }

  $("[name='cantripsknown']").val(cantrips === null ? "" : cantrips)
  $("[name='spellsknown']").val(known === null ? "" : known)
  $("[name='spellsprepared']").val(prepared === null ? "" : prepared)
  $("#spellspreparedcol, #spellspreparedcell").css("display", prepared === null ? "none" : "")
  for (var i = 0; i < 9; i++) {
    $("[name='spellslotsmax" + (i + 1) + "']").val(slots[i] === 0 ? "" : slots[i])
  }

  // Spell list rows, split per class (PHB p.164: spells known/prepared are
  // tracked separately per class) — cantrip rows for each class first, then
  // subclass bonus (always-prepared) rows, then spell rows, so a Cleric
  // 9/Druid 2 shows which prepared spells come from being a Cleric vs. a
  // Druid, plus any domain/oath/circle spells automatically filled in.
  var groups = []
  classes.forEach(function(c, idx) {
    var cantripVal = knownValue(c.name, c.level, "Cantrips Known")
    groups.push({ key: "c" + (idx + 1), kind: "spell-row-cantrip", className: c.name, count: cantripVal === null ? 0 : cantripVal })
  })
  classes.forEach(function(c, idx) {
    var subclassChoice = $("[name='subclass" + (idx + 1) + "']").val()
    var bonusNames = subclassBonusSpells(c.name, subclassChoice, c.level)
    if (bonusNames.length > 0) {
      groups.push({ key: "b" + (idx + 1), kind: "spell-row-bonus", className: c.name, count: bonusNames.length, rows: bonusNames.map(bonusSpellRowData) })
    }
  })
  classes.forEach(function(c, idx) {
    var knownVal = knownValue(c.name, c.level, "Spells Known")
    var preparedVal = preparedValue(c.name, c.level)
    var count = (knownVal === null ? 0 : knownVal) + (preparedVal === null ? 0 : preparedVal)
    // Prepared casters (Cleric/Druid/Paladin/Wizard): a spell occupying one
    // of these rows is by definition one of the day's prepared spells, so
    // new rows default to checked. Known casters (Bard/Ranger/Sorcerer/
    // Warlock) don't have a "prepare from your list" mechanic — they just
    // know a fixed spell — so this stays unchecked for them, as before.
    groups.push({ key: "s" + (idx + 1), kind: "spell-row-spell", className: c.name, count: count, defaultPrepChecked: c.name in PREPARED_CASTER_ABILITY })
  })
  syncSpellListRows(groups)
}

$("[name='class1'], [name='level1'], [name='class2'], [name='level2'], [name='Wisdomscore'], [name='Charismascore'], [name='Intelligencescore'], [name='subclass1'], [name='subclass2']").bind('input change', function() {
  updateProficiencyBonus()
  updateSpellsAvailable()
})

loadClassesData()

// ---- Spell list (Cantrips Known rows + Spells Known/Prepared rows) ----
// Row count is derived live from Spells Available, not user-managed. PHB
// multiclass rule: each class's spells known/prepared are tracked
// separately (p.164), so Spells Known + Spells Prepared is the correct
// total — they're never both non-null for the same class.
var SPELLS_BY_NAME = {}
if (typeof obj !== 'undefined' && obj.spells) {
  obj.spells.forEach(function(s) { SPELLS_BY_NAME[s.Name.toLowerCase()] = s })
}

function buildSpellDatalist()
{
  var datalist = document.getElementById('spellnames-datalist')
  if (!datalist || typeof obj === 'undefined' || !obj.spells) return
  var names = obj.spells.map(function(s) { return s.Name }).sort()
  datalist.innerHTML = names.map(function(n) {
    return "<option value='" + n.replace(/'/g, "&#39;") + "'></option>"
  }).join("")
}
buildSpellDatalist()

function collectSpellRowData(groupKey)
{
  var rows = []
  $("#spelltable tr.spell-group-" + groupKey).each(function() {
    var $tr = $(this)
    rows.push({
      prep: $tr.find("input[name^='spellprep']").prop("checked"),
      name: $tr.find("input[name^='spellname']").val(),
      level: $tr.find("input[name^='spelllevel']").val(),
      attacksave: $tr.find("input[name^='spellattacksave']").val(),
      time: $tr.find("input[name^='spelltime']").val(),
      range: $tr.find("input[name^='spellrange']").val(),
      duration: $tr.find("input[name^='spellduration']").val()
    })
  })
  return rows
}

function escapeAttr(value)
{
  return String(value == null ? "" : value).replace(/"/g, "&quot;")
}

// className is structural (which class this row's spell slot belongs to,
// set from the class/level fields) rather than spell data, so it's readonly
// and untouched by the spellnames-datalist autofill below. Bonus rows
// (subclass-granted spells) are fully system-derived, so their spell fields
// are locked too, and Prepared is forced checked+disabled — PHB: "you
// always have it prepared... doesn't count against the number of spells
// you can prepare each day."
function buildSpellRow(id, rowClasses, className, data, locked)
{
  data = data || {}
  var ro = locked ? " readonly" : ""
  var tr = document.createElement("tr")
  tr.className = rowClasses
  tr.innerHTML =
    "<td><input name='spellprep" + id + "' type='checkbox'" + (data.prep ? " checked" : "") + (locked ? " disabled" : "") + " /></td>" +
    "<td><input name='spellname" + id + "' type='text' list='spellnames-datalist' value=\"" + escapeAttr(data.name) + "\"" + ro + " /></td>" +
    "<td><input name='spelllevel" + id + "' type='text' value=\"" + escapeAttr(data.level) + "\"" + ro + " /></td>" +
    "<td><input name='spellclass" + id + "' type='text' value=\"" + escapeAttr(className) + "\" readonly /></td>" +
    "<td><input name='spellattacksave" + id + "' type='text' value=\"" + escapeAttr(data.attacksave) + "\" /></td>" +
    "<td><input name='spelltime" + id + "' type='text' value=\"" + escapeAttr(data.time) + "\"" + ro + " /></td>" +
    "<td><input name='spellrange" + id + "' type='text' value=\"" + escapeAttr(data.range) + "\"" + ro + " /></td>" +
    "<td><input name='spellduration" + id + "' type='text' value=\"" + escapeAttr(data.duration) + "\"" + ro + " /></td>"
  return tr
}

// groups: [{ key, kind, className, count, rows? }, ...] in display order.
// kind drives the row color; key scopes data preservation/resizing to that
// specific (class, row-type) group. Groups with a precomputed `rows` array
// (subclass bonus spells) are fully derived, so they're rebuilt fresh every
// time rather than preserved/truncated from prior DOM content.
var lastSpellGroupClassName = {}
function rebuildSpellList(groups)
{
  var preserved = {}
  groups.forEach(function(g) {
    // A group key (e.g. "s1") is reused across whatever class currently
    // occupies that slot. If the class itself changed (not just its level
    // or ability scores), the old rows — including checkbox state — belong
    // to a different class's spell list and shouldn't carry over.
    var classChanged = lastSpellGroupClassName[g.key] !== undefined && lastSpellGroupClassName[g.key] !== g.className
    preserved[g.key] = g.rows ? g.rows.slice() : (classChanged ? [] : collectSpellRowData(g.key))
    if (!g.rows) preserved[g.key].length = g.count
    lastSpellGroupClassName[g.key] = g.className
  })

  var tbody = document.getElementById("spelltable")
  tbody.innerHTML = ""
  var id = 0
  groups.forEach(function(g) {
    var data = preserved[g.key]
    var locked = g.kind === "spell-row-bonus"
    for (var i = 0; i < g.count; i++) {
      // Newly-appearing rows (not previously on the sheet) default to
      // Prepared checked for prepared-caster classes — occupying one of
      // these rows already means it's one of that day's prepared spells.
      // Existing rows keep whatever the user already set.
      var rowData = data[i] || (g.defaultPrepChecked ? { prep: true } : undefined)
      tbody.appendChild(buildSpellRow(id++, g.kind + " spell-group-" + g.key, g.className, rowData, locked))
    }
  })
}

var lastSpellGroupsSignature = null
function syncSpellListRows(groups)
{
  // Precomputed rows (subclass bonus spells) can change without count or
  // className changing (e.g. switching domain at the same level), so their
  // spell names are folded into the signature too.
  var signature = groups.map(function(g) {
    var rowsPart = g.rows ? g.rows.map(function(r) { return r.name }).join(",") : ""
    return g.key + ":" + g.className + ":" + g.count + ":" + rowsPart
  }).join("|")
  if (signature === lastSpellGroupsSignature) return
  lastSpellGroupsSignature = signature
  rebuildSpellList(groups)
}

// Autofill Level/Cast Time/Range/Duration from data/spells.js when a row's
// spell name matches. Attack/Save has no equivalent field in that dataset,
// so it stays manual. Delegated since rows are rebuilt dynamically.
$("#spelltable").on("input", "input[list='spellnames-datalist']", function() {
  var spell = SPELLS_BY_NAME[this.value.trim().toLowerCase()]
  if (!spell) return
  var id = this.name.replace("spellname", "")
  $("[name='spelllevel" + id + "']").val(spell["Level"])
  $("[name='spelltime" + id + "']").val(spell["Casting Time"])
  $("[name='spellrange" + id + "']").val(spell["Range"])
  $("[name='spellduration" + id + "']").val(spell["Duration"])
})

function totalhd_clicked()
{
  $("[name='remaininghd']").val($("[name='totalhd']").val())
}

// Row counts used for saving/loading characters
var rows_attacks = 2;
var rows_inventory = 2;
var rows_attunements = 3;

// Builds a plain object of every named form field (used by both the local
// file export and cloud sync, so the on-disk and Firestore formats stay identical).
function serializeCharacterForm()
{
  const formId = "charsheet";
  var url = location.href;
  const formIdentifier = `${url} ${formId}`;
  let form = document.querySelector(`#${formId}`);
  let formElements = form.elements;

  let data = { [formIdentifier]: {} };
  for (const element of formElements) {
    if (element.name.length > 0) {
      if (element.type == 'checkbox') {
        var checked = ($("[name='" + element.name + "']").prop("checked") ? 'checked' : 'unchecked');
        data[formIdentifier][element.name] = checked;
      } else {
        data[formIdentifier][element.name] = element.value;
      }
    }
  }
  return data[formIdentifier];
}
window.serializeCharacterForm = serializeCharacterForm;

// Pre-rename saves stored "Class & Level" and "Multiclass" as single free-text
// fields (e.g. "Wizard 5"). Splits those into the current class1/level1 and
// class2/level2 fields so older saves don't silently lose class/level data.
function parseLegacyClassLevel(text)
{
  var match = text.trim().match(/^(.*?)\s+(\d+)$/)
  if (!match) return null
  return { className: match[1].trim(), level: match[2] }
}

function migrateLegacyClassLevelFields(savedData)
{
  if (savedData.class1 === undefined && typeof savedData.classlevel === 'string' && savedData.classlevel.trim() !== '') {
    var parsed1 = parseLegacyClassLevel(savedData.classlevel)
    if (parsed1) {
      savedData.class1 = parsed1.className
      savedData.level1 = parsed1.level
    }
  }
  if (savedData.class2 === undefined && typeof savedData.classlevel2 === 'string' && savedData.classlevel2.trim() !== '') {
    var parsed2 = parseLegacyClassLevel(savedData.classlevel2)
    if (parsed2) {
      savedData.class2 = parsed2.className
      savedData.level2 = parsed2.level
    }
  }
}

// Applies a previously-serialized character object (see serializeCharacterForm)
// back onto the form, adjusting dynamic table row counts first. Used by both
// the local file import and cloud sync.
function applyCharacterData(savedData)
{
  migrateLegacyClassLevelFields(savedData)

  while (rows_attacks > parseInt(savedData.rows_attacks)) {
    remove_last_row('attacktable');
  }
  while (rows_attacks < parseInt(savedData.rows_attacks)) {
    add_attack();
  }

  while (rows_attunements > parseInt(savedData.rows_attunements)) {
    remove_last_row('attunementtable');
  }
  while (rows_attunements < parseInt(savedData.rows_attunements)) {
    add_attunement();
  }

  while (rows_inventory > parseInt(savedData.rows_inventory)) {
    remove_last_row('inventorytable');
  }
  while (rows_inventory < parseInt(savedData.rows_inventory)) {
    add_inventory();
  }

  // Spell list rows are derived from class/level + ability scores (see
  // syncSpellListRows), not a stored count. Restore those fields first so
  // the row count and cantrip/prepared split are correct before the spell
  // row data itself is applied below.
  ["class1", "level1", "class2", "level2", "Strengthscore", "Dexterityscore", "Constitutionscore", "Intelligencescore", "Wisdomscore", "Charismascore"].forEach(function(name) {
    if (name in savedData) $("[name='" + name + "']").val(savedData[name])
  })
  updateSpellsAvailable();

  // subclass1/subclass2's <option> lists only exist once updateSpellsAvailable()
  // has run once for the restored class, so the saved choice has to be
  // applied after that — then recomputed once more to pick up any subclass
  // bonus spell rows.
  ["subclass1", "subclass2"].forEach(function(name) {
    if (name in savedData) $("[name='" + name + "']").val(savedData[name])
  })
  updateSpellsAvailable()

  const formId = "charsheet";
  let form = document.querySelector(`#${formId}`);
  let formElements = form.elements;

  for (const element of formElements) {
    if (element.name in savedData) {
      if (element.type == 'checkbox') {
        var checked = (savedData[element.name] == 'checked');
        $("[name='" + element.name + "']").prop("checked", checked)
      } else {
        element.value = savedData[element.name];
      }
    }
  }

  updateProficiencyBonus();
  updateSpellsAvailable();
}
window.applyCharacterData = applyCharacterData;

function save_character()
{
  console.log("Saving character...")

  var filename = ".dnd";
  if (document.getElementById('charname').value == "") {
    filename = "CharacterSheet" + filename;
  } else {
    filename = document.getElementById('charname').value + filename;
  }

  var data = JSON.stringify(serializeCharacterForm(), null, 2)
  type = 'application/json'

  // Save JSON to file
  var file = new Blob([data], {type: type});
  if (window.navigator.msSaveOrOpenBlob) // IE10+
      window.navigator.msSaveOrOpenBlob(file, filename);
  else { // Others
      var a = document.createElement("a"),
              url = URL.createObjectURL(file);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);  
      }, 0); 
  }
}

// Functions for reading character from disk
function load_character(e) {

  // Load character
  var file = e.target.files[0];
  if (!file) {
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    var contents = e.target.result;
    var savedData = JSON.parse(contents);
    applyCharacterData(savedData);
  };
  reader.readAsText(file);
}
document.getElementById('buttonload').addEventListener('change', load_character, false);

function long_rest()
{
  console.log("Taking long rest...")
  /*
   *  To do on a long rest:
   * 
   *  x Reset hit points to max HP
   *  x Reset hit dice to max hit dice
   *  x Reset all spell slots available to max
   *  x Reset all death saves
   *  x Remind player to reset temp HP and limited use features and items
   *  
   */


  $("[name='currenthp']").val(0)
  $("[name='remaininghd']").val($("[name='totalhd']").val())
  $("[name='bonusmaxhp']").val($("[name='maxhp']").val())
  $("[name='pactslots1']").val($("[name='pactslotsmax1']").val())

  $("[name='deathsuccess1']").prop("checked", false);
  $("[name='deathsuccess2']").prop("checked", false);
  $("[name='deathsuccess3']").prop("checked", false);
  $("[name='deathfail1']").prop("checked", false);
  $("[name='deathfail2']").prop("checked", false);
  $("[name='deathfail3']").prop("checked", false);


  alert("Hit points, hit dice, and spell slots have been refreshed.\n\nPlease remember to reset Limited Use abilities, temporary hit points, and other effects as needed.")
}

function add_attack()
{
  var tableRef = document.getElementById('attacktable')

  var row = tableRef.insertRow(tableRef.rows.length)

  var cell0 = row.insertCell(0);
  var cell1 = row.insertCell(1);
  var cell2 = row.insertCell(2);
  var cell3 = row.insertCell(3);

  cell0.innerHTML = "<td><input name='atkname" + rows_attacks + "' type='text'/></td>";
  cell1.innerHTML = "<td><input name='atkbonus" + rows_attacks + "' type='text'/></td>";
  cell2.innerHTML = "<td><input name='atkdamage" + rows_attacks + "' type='text'/></td>";
  cell3.innerHTML = "<td colspan='2'><input name='atknotes" + rows_attacks + "' type='text'/></td>";

  rows_attacks += 1;
  $("[name='rows_attacks']").val(rows_attacks);
}

function add_inventory()
{
  var tableRef = document.getElementById('inventorytable')

  var row = tableRef.insertRow(tableRef.rows.length)

  var cell0 = row.insertCell(0);
  var cell1 = row.insertCell(1);
  var cell2 = row.insertCell(2);
  var cell3 = row.insertCell(3);
  var cell4 = row.insertCell(4);
  var cell5 = row.insertCell(5);

  cell0.innerHTML = "<td><input name='itemequipped" + rows_inventory + "' type='checkbox' /></td>";
  cell1.innerHTML = "<td><input name='itemname" + rows_inventory + "' type='text' /></td>";
  cell2.innerHTML = "<td><input name='itemcount" + rows_inventory + "' type='text' onchange='calc_carry_weight()' /></td>";
  cell3.innerHTML = "<td><input name='itemweight" + rows_inventory + "' type='text' onchange='calc_carry_weight()' /></td>";
  cell4.innerHTML = "<td><input name='itemvalue" + rows_inventory + "' type='text' /></td>";
  cell5.innerHTML = "<td><input name='itemnotes" + rows_inventory + "' type='text' /></td>";

  rows_inventory += 1;
  $("[name='rows_inventory']").val(rows_inventory);
}

function add_attunement()
{
  var tableRef = document.getElementById('attunementtable')

  var row = tableRef.insertRow(tableRef.rows.length)

  var cell0 = row.insertCell(0);

  cell0.innerHTML = "<td><input name='attunement" + rows_attunements + "' type='text' /></td>";

  rows_attunements += 1;
  $("[name='rows_attunements']").val(rows_attunements);
}

function remove_last_row(tableId)
{
  var tableRef = document.getElementById(tableId);
  var rowCount = tableRef.rows.length;
  tableRef.deleteRow(rowCount - 1);

  switch(tableId) {
    case 'attacktable':
      rows_attacks -= 1;
      if (rows_attacks < 0) {
        rows_attacks = 0;
      }
      break;
    case 'attunementtable':
      rows_attunements -= 1;
      if (rows_attunements < 0) {
        rows_attunements = 0;
      }
      break;
    case 'inventorytable':
      rows_inventory -= 1;
      if (rows_inventory < 0) {
        rows_inventory = 0;
      }
      break;
  }
  $("[name='rows_attacks']").val(rows_attacks);
  $("[name='rows_attunements']").val(rows_attunements);
  $("[name='rows_inventory']").val(rows_inventory);
}

function calc_carry_weight()
{
  var total = 0;
  var table = document.getElementById("inventorytable");
  var trs = table.getElementsByTagName('tr');
  for (var i=0; i < trs.length; i++) {
      var tds = trs[i].getElementsByTagName('td');

      var count_str = tds[2].getElementsByTagName('input')[0].value;
      var weight_str = tds[3].getElementsByTagName('input')[0].value;

      var count = (isNaN(parseFloat(count_str)) ? 0 : parseFloat(count_str))
      var weight = (isNaN(parseFloat(weight_str)) ? 0 : parseFloat(weight_str))

      console.log(count + " * " + weight + " = " + (count * weight));
      total += count * weight;
  }
  document.getElementById("weightcarried").value = parseInt(total + 0.5);
}
