let spellArray;

// Filter state — all three combine together.
const filterState = {
    level: '*',
    class: '*',
    search: ''
};

const CLASSES = ['Artificer', 'Bard', 'Cleric', 'Druid', 'Monk', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'];

document.addEventListener("DOMContentLoaded", () => {
    buildNav();
    buildClassNav();
    applyFilters();
});

function applyFilters() {
    spellArray = obj.spells.filter((spell) => {
        // Level
        if (filterState.level !== '*') {
            if (spell.Level.charAt(0) != filterState.level) return false;
        }

        // Class (matches core Classes or Optional/Variant Classes)
        if (filterState.class !== '*') {
            const core = (spell.Classes || '').toLowerCase();
            const opt = (spell['Optional/Variant Classes'] || '').toLowerCase();
            const cls = filterState.class.toLowerCase();
            if (!core.includes(cls) && !opt.includes(cls)) return false;
        }

        // Search
        if (filterState.search) {
            const s = filterState.search.toLowerCase();
            const match =
                spell.Name.toLowerCase().includes(s) ||
                (spell.Classes || '').toLowerCase().includes(s) ||
                (spell.Source || '').toLowerCase().includes(s) ||
                (spell.School || '').toLowerCase().includes(s) ||
                (spell.Components || '').toLowerCase().includes(s) ||
                (spell['Optional/Variant Classes'] || '').toLowerCase().includes(s) ||
                (spell.Text || '').toLowerCase().includes(s);
            if (!match) return false;
        }

        return true;
    });

    buildSpellList();
}

function buildSpellList() {
    spellList.innerHTML = '';
    let i = 1;

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

        if (spell.Level === 'Cantrip') {
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

    const allBtn = document.createElement('button');
    allBtn.innerText = 'All';
    allBtn.classList.add('filterBtn', 'active');
    allBtn.addEventListener('click', () => {
        filterSpells('*', allBtn);
    });
    navList.insertAdjacentElement('beforeend', allBtn);

    for (let i = currentLevel; i <= maxLevel; i++) {
        const btn = document.createElement('button');
        btn.classList.add('filterBtn');
        if (i === 0) {
            btn.innerText = 'C';
        } else {
            btn.innerText = i;
        }
        btn.addEventListener('click', () => {
            filterSpells(i === 0 ? 'C' : i, btn);
        });
        navList.insertAdjacentElement('beforeend', btn);
    }
}

function buildClassNav() {
    const allBtn = document.createElement('button');
    allBtn.innerText = 'All';
    allBtn.classList.add('filterBtn', 'active');
    allBtn.addEventListener('click', () => {
        filterByClass('*', allBtn);
    });
    classList.insertAdjacentElement('beforeend', allBtn);

    CLASSES.forEach(cls => {
        const btn = document.createElement('button');
        btn.innerText = cls;
        btn.classList.add('filterBtn');
        btn.addEventListener('click', () => {
            filterByClass(cls, btn);
        });
        classList.insertAdjacentElement('beforeend', btn);
    });
}

function setActive(button) {
    // Clear active state on siblings within the same button row.
    const row = button.parentElement;
    row.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    button.classList.add('active');
}

function filterSpells(level, button) {
    filterState.level = level;
    if (button) setActive(button);
    applyFilters();
}

function filterByClass(cls, button) {
    filterState.class = cls;
    if (button) setActive(button);
    applyFilters();
}

function searchSpells() {
    filterState.search = document.getElementById('txtSearch').value;
    applyFilters();
}
