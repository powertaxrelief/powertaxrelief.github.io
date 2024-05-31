let spellArray;

document.addEventListener("DOMContentLoaded",() => {
        spellArray = obj.spells; 
        buildSpellList();
        buildNav();
 });


function buildSpellList() {
    let i=1;

    spellArray.forEach(spell => {
        const container = document.createElement('div');
        container.classList.add('collapsible');
        container.style.width = '100%';
        const input = document.createElement('input');
        input.setAttribute('id', 'collapsible' + i);
        input.setAttribute('type', 'checkbox');
        input.setAttribute('name', 'collapsible');
        
        const label = document.createElement('label');
        label.setAttribute('for', 'collapsible' + i);
        label.innerText = spell.Name;
       
        const div = document.createElement('div');
        div.classList.add('collapsible-body');

        const span = document.createElement('span');
        
        const schoolLevelLabel = document.createElement('p');
        
        if(spell.Level === 'Cantrip') {
            schoolLevelLabel.innerText = '' + spell.Level + ' ' + spell.School;
        } else {
            schoolLevelLabel.innerText = spell.Level + ' Level ' + spell.School;
        }
       
        
        const descriptionLabel = document.createElement('p');
        descriptionLabel.innerText = spell.Text;

        const sourceLabel = document.createElement('p');
        sourceLabel.innerText = 'Source: ' + spell.Source + ' page:' + spell.Page;

        const castingTimeLabel = document.createElement('p');
        castingTimeLabel.innerText = 'Casting Time: ' + spell['Casting Time'];
        
        const durationLabel = document.createElement('p');
        durationLabel.innerText = 'Duration: ' + spell.Duration;

        const rangeLabel = document.createElement('p');
        rangeLabel.innerText = 'Range: ' + spell.Range;

        const componentsLabel = document.createElement('p');
        componentsLabel.innerText = 'Components: ' + spell.Components;

        const classesLabel = document.createElement('p');   
        classesLabel.innerText = 'Classes: ' + spell.Classes;

        const optionalClassesLabel = document.createElement('p');
        optionalClassesLabel.innerText = 'Optional/Variant Classes: ' + spell['Optional/Variant Classes'];

        const atHigherLevelsLabel = document.createElement('p');
        atHigherLevelsLabel.innerText = 'At Higher Levels: ' + spell['At Higher Levels'];

        container.appendChild(input);
        container.appendChild(label);
        div.appendChild(span);
        span.appendChild(schoolLevelLabel);
        span.appendChild(descriptionLabel);
        span.appendChild(sourceLabel);
        span.appendChild(castingTimeLabel);
        span.appendChild(durationLabel);
        span.appendChild(rangeLabel);
        span.appendChild(componentsLabel);
        span.appendChild(classesLabel);
        span.appendChild(optionalClassesLabel);
        span.appendChild(atHigherLevelsLabel);
        container.appendChild(div);
        container.innerHTML += '</div>';
        spellList.insertAdjacentElement('beforeend', container);
        i++;
    });
}

function buildNav() {
    let currentLevel = 0;
    let maxLevel = 9;
    const container = document.createElement('button');
    container.innerText = '*';   
    container.addEventListener('click', () => {
            filterSpells('*'); 
    });
    navList.insertAdjacentElement('beforeend', container);
    for (let i = currentLevel; i <= maxLevel; i++) {
        const container = document.createElement('button');
        if(i===0) {
            container.innerText = 'C';   
        }else{
            container.innerText = i;
        }
        container.addEventListener('click', () => {
            if(i===0) {
                filterSpells('C');   
            }else{
                filterSpells(i);
            }
            
        });
        navList.insertAdjacentElement('beforeend', container);
    }
}

function filterSpells(level) {  
    spellArray = obj.spells; 
    if (level != '*'){
        let tempArray = 
        spellArray.filter((spell) => {
            return spell.Level.charAt(0) == level;
        });
        spellArray = tempArray;
    }
    spellList.innerHTML = '';
    buildSpellList();
}

function searchSpells() {
    let search = document.getElementById('txtSearch').value;
    spellArray = obj.spells; 
    let tempArray = 
    spellArray.filter((spell) => {
        return spell.Name.toLowerCase().includes(search.toLowerCase()) ||
        spell.Classes.toLowerCase().includes(search.toLowerCase()) || 
        spell.Source.toLowerCase().includes(search.toLowerCase()) || 
        spell.School.toLowerCase().includes(search.toLowerCase()) || 
        spell.Components.toLowerCase().includes(search.toLowerCase()) || 
        spell['Optional/Variant Classes'].toLowerCase().includes(search.toLowerCase()) || 
        spell.Text.toLowerCase().includes(search.toLowerCase());
    });
    spellArray = tempArray;
    spellList.innerHTML = '';
    buildSpellList();
}