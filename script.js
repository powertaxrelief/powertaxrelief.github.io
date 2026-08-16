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

function resolveClassName(input)
{
  if (!classesData || !input) return null
  var target = input.trim().toLowerCase()
  for (var key in classesData) {
    if (key.toLowerCase() === target) return key
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

function updateSpellsAvailable()
{
  if (!classesData) return

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

  if (classes.length === 1) {
    slots = singleClassSlots(classes[0].name, classes[0].level)
    cantrips = knownValue(classes[0].name, classes[0].level, "Cantrips Known")
    known = knownValue(classes[0].name, classes[0].level, "Spells Known")
  } else if (classes.length === 2) {
    var effectiveLevel = 0
    var hasEffective = false
    var cantripsTotal = 0, cantripsFound = false
    var knownTotal = 0, knownFound = false

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

      var cKnown = knownValue(c.name, c.level, "Cantrips Known")
      if (cKnown !== null) { cantripsTotal += cKnown; cantripsFound = true }
      var sKnown = knownValue(c.name, c.level, "Spells Known")
      if (sKnown !== null) { knownTotal += sKnown; knownFound = true }
    })

    if (hasEffective && effectiveLevel >= 1) {
      var row = MULTICLASS_SLOTS[Math.min(effectiveLevel, 20)]
      slots = slots.map(function(v, i) { return v + row[i] })
    }

    cantrips = cantripsFound ? cantripsTotal : null
    known = knownFound ? knownTotal : null
  }

  $("[name='cantripsknown']").val(cantrips === null ? "" : cantrips)
  $("[name='spellsknown']").val(known === null ? "" : known)
  for (var i = 0; i < 9; i++) {
    $("[name='spellslotsmax" + (i + 1) + "']").val(slots[i] === 0 ? "" : slots[i])
  }
}

$("[name='class1'], [name='level1'], [name='class2'], [name='level2']").bind('input change', function() {
  updateProficiencyBonus()
  updateSpellsAvailable()
})

loadClassesData()

function totalhd_clicked()
{
  $("[name='remaininghd']").val($("[name='totalhd']").val())
}

// Row counts used for saving/loading characters
var rows_attacks = 2;
var rows_inventory = 2;
var rows_attunements = 3;
var rows_spells = 2;

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

  while (rows_spells > parseInt(savedData.rows_spells)) {
    remove_last_row('spelltable');
  }
  while (rows_spells < parseInt(savedData.rows_spells)) {
    add_spell();
  }

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

  $("[name='spellbox1']").prop("checked", false);
  $("[name='spellbox2']").prop("checked", false);
  $("[name='spellbox3']").prop("checked", false);
  $("[name='spellbox4']").prop("checked", false);
  $("[name='spellbox5']").prop("checked", false);
  $("[name='spellbox6']").prop("checked", false);
  $("[name='spellbox7']").prop("checked", false);
  $("[name='spellbox8']").prop("checked", false);
  $("[name='spellbox9']").prop("checked", false);
  $("[name='spellbox10']").prop("checked", false);

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

function add_spell()
{
  var tableRef = document.getElementById('spelltable')

  var row = tableRef.insertRow(tableRef.rows.length)

  var cell0 = row.insertCell(0);
  var cell1 = row.insertCell(1);
  var cell2 = row.insertCell(2);
  var cell3 = row.insertCell(3);
  var cell4 = row.insertCell(4);
  var cell5 = row.insertCell(5);
  var cell6 = row.insertCell(6);
  var cell7 = row.insertCell(7);

  cell0.innerHTML = "<td><input name='spellprep" + rows_spells + "' type='checkbox' /></td>";
  cell1.innerHTML = "<td><input name='spellname" + rows_spells + "' type='text' /></td>";
  cell2.innerHTML = "<td><input name='spelllevel" + rows_spells + "' type='text' /></td>";
  cell3.innerHTML = "<td><input name='spellsource" + rows_spells + "' type='text' /></td>";
  cell4.innerHTML = "<td><input name='spellattacksave" + rows_spells + "' type='text' /></td>";
  cell5.innerHTML = "<td><input name='spelltime" + rows_spells + "' type='text' /></td>";
  cell6.innerHTML = "<td><input name='spellrange" + rows_spells + "' type='text' /></td>";
  cell7.innerHTML = "<td><input name='spellduration" + rows_spells + "' type='text' /></td>";

  rows_spells += 1;
  $("[name='rows_spells']").val(rows_spells);
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
    case 'spelltable':
      rows_spells -= 1;
      if (rows_spells < 0) {
        rows_spells = 0;
      }
      break;
  }
  $("[name='rows_attacks']").val(rows_attacks);
  $("[name='rows_attunements']").val(rows_attunements);
  $("[name='rows_inventory']").val(rows_inventory);
  $("[name='rows_spells']").val(rows_spells);
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
