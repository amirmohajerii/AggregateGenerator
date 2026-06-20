// Check if File System Access API is supported
const isFileSystemSupported = 'showDirectoryPicker' in window;
let directoryHandle = null;
let templatesHandle = null;
let useFallbackZip = false;

// Store compiled templates
const compiledTemplates = {};

// Property counter
let propertyCounter = 0;

// DOM Elements
const selectDirBtn = document.getElementById('selectDirBtn');
const selectTemplatesBtn = document.getElementById('selectTemplatesBtn');
const selectedPathDiv = document.getElementById('selectedPath');
const templatesPathDiv = document.getElementById('templatesPath');
const templatesStatusDiv = document.getElementById('templatesStatus');
const notSupportedDiv = document.getElementById('notSupported');
const generateBtn = document.getElementById('generateBtn');
const generatorForm = document.getElementById('generatorForm');
const propertiesContainer = document.getElementById('propertiesContainer');
const emptyProperties = document.getElementById('emptyProperties');
const propertyCounterDiv = document.getElementById('propertyCounter');
const addPropertyBtn = document.getElementById('addPropertyBtn');

// Show/hide fallback message
if (!isFileSystemSupported) {
    notSupportedDiv.style.display = 'block';
    useFallbackZip = true;
}

// Register Handlebars helpers
Handlebars.registerHelper('plural', function(txt) {
    return pluralize(txt);
});

Handlebars.registerHelper('camel', function(txt) {
    return txt.charAt(0).toLowerCase() + txt.slice(1);
});

Handlebars.registerHelper('add', function(a, b) {
    return Number(a) + Number(b);
});

Handlebars.registerHelper('equals', function(a, b) {
    return a === b;
});

// Pluralize function
function pluralize(word) {
    const irregulars = {
        'person': 'people',
        'man': 'men',
        'woman': 'women',
        'child': 'children',
        'tooth': 'teeth',
        'foot': 'feet',
        'mouse': 'mice',
        'goose': 'geese'
    };

    if (irregulars[word.toLowerCase()]) {
        return word.charAt(0) === word.charAt(0).toUpperCase() 
            ? irregulars[word.toLowerCase()].charAt(0).toUpperCase() + irregulars[word.toLowerCase()].slice(1)
            : irregulars[word.toLowerCase()];
    }

    if (word.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(word[word.length - 2].toLowerCase())) {
        return word.slice(0, -1) + 'ies';
    }
    if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z') || word.endsWith('ch') || word.endsWith('sh')) {
        return word + 'es';
    }
    return word + 's';
}

// Create property row
function createPropertyRow(type = 'regular') {
    propertyCounter++;
    const rowId = `property-${propertyCounter}`;
    
    const row = document.createElement('div');
    row.className = `property-row ${type === 'enum' ? 'enum-row' : ''}`;
    row.id = rowId;
    
    if (type === 'enum') {
        row.innerHTML = `
            <select class="property-type-select" onchange="handlePropertyTypeChange('${rowId}')">
                <option value="regular">Regular</option>
                <option value="enum" selected>Enum</option>
                <option value="foreignKey">Foreign Key</option>
            </select>
            <input type="text" class="property-enum-name" placeholder="Enum Name (e.g., Rooz)" required>
            <input type="text" class="property-enum-values" placeholder="Values (comma separated, e.g., HOOP,HOOP2)" required>
            <select class="property-default-value">
                <option value="">(none)</option>
                <option value="= null!;">= null!;</option>
                <option value="= String.Empty;">= String.Empty;</option>
                <option value="= [ ];">= [ ];</option>
                <option value="= new();">= new();</option>
                <option value="custom">Custom...</option>
            </select>
            <button type="button" class="btn btn-remove" onclick="removeProperty('${rowId}')">✕</button>
        `;
    } else {
        row.innerHTML = `
            <select class="property-type-select" onchange="handlePropertyTypeChange('${rowId}')">
                <option value="regular" ${type === 'regular' ? 'selected' : ''}>Regular</option>
                <option value="enum">Enum</option>
                <option value="foreignKey" ${type === 'foreignKey' ? 'selected' : ''}>Foreign Key</option>
            </select>
            <input type="text" class="property-datatype" placeholder="Data Type (e.g., string, int)" required>
            <input type="text" class="property-name" placeholder="Property Name (e.g., Code)" required>
            <select class="property-default-value" onchange="handleDefaultValueChange('${rowId}')">
                <option value="">(none)</option>
                <option value="= null!;">= null!;</option>
                <option value="= String.Empty;">= String.Empty;</option>
                <option value="= [ ];">= [ ];</option>
                <option value="= new();">= new();</option>
                <option value="custom">Custom...</option>
            </select>
            <button type="button" class="btn btn-remove" onclick="removeProperty('${rowId}')">✕</button>
        `;
    }
    
    return row;
}

// Handle property type change
function handlePropertyTypeChange(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    
    const select = row.querySelector('.property-type-select');
    const newType = select.value;
    
    let defaultValue = '';
    const defaultSelect = row.querySelector('.property-default-value');
    const defaultCustomInput = row.querySelector('.property-default-value-custom');
    
    if (defaultCustomInput) {
        defaultValue = defaultCustomInput.value;
    } else if (defaultSelect) {
        defaultValue = defaultSelect.value;
    }
    
    let currentValues = { defaultValue: defaultValue };
    
    if (newType === 'enum') {
        const datatypeInput = row.querySelector('.property-datatype');
        const nameInput = row.querySelector('.property-name');
        currentValues = {
            ...currentValues,
            name: nameInput ? nameInput.value : '',
            datatype: datatypeInput ? datatypeInput.value : ''
        };
    } else {
        const enumNameInput = row.querySelector('.property-enum-name');
        const enumValuesInput = row.querySelector('.property-enum-values');
        const datatypeInput = row.querySelector('.property-datatype');
        const nameInput = row.querySelector('.property-name');
        currentValues = {
            ...currentValues,
            enumName: enumNameInput ? enumNameInput.value : '',
            enumValues: enumValuesInput ? enumValuesInput.value : '',
            name: nameInput ? nameInput.value : '',
            datatype: datatypeInput ? datatypeInput.value : ''
        };
    }
    
    const newRow = document.createElement('div');
    newRow.className = `property-row ${newType === 'enum' ? 'enum-row' : ''}`;
    newRow.id = rowId;
    
    if (newType === 'enum') {
        newRow.innerHTML = `
            <select class="property-type-select" onchange="handlePropertyTypeChange('${rowId}')">
                <option value="regular">Regular</option>
                <option value="enum" selected>Enum</option>
                <option value="foreignKey">Foreign Key</option>
            </select>
            <input type="text" class="property-enum-name" placeholder="Enum Name (e.g., Rooz)" value="${currentValues.name || currentValues.enumName || ''}" required>
            <input type="text" class="property-enum-values" placeholder="Values (comma separated, e.g., HOOP,HOOP2)" value="${currentValues.enumValues || ''}" required>
            <select class="property-default-value">
                <option value="">(none)</option>
                <option value="= null!;">= null!;</option>
                <option value="= String.Empty;">= String.Empty;</option>
                <option value="= [ ];">= [ ];</option>
                <option value="= new();">= new();</option>
                <option value="custom">Custom...</option>
            </select>
            <button type="button" class="btn btn-remove" onclick="removeProperty('${rowId}')">✕</button>
        `;
    } else {
        newRow.innerHTML = `
            <select class="property-type-select" onchange="handlePropertyTypeChange('${rowId}')">
                <option value="regular" ${newType === 'regular' ? 'selected' : ''}>Regular</option>
                <option value="enum">Enum</option>
                <option value="foreignKey" ${newType === 'foreignKey' ? 'selected' : ''}>Foreign Key</option>
            </select>
            <input type="text" class="property-datatype" placeholder="Data Type (e.g., string, int)" value="${currentValues.datatype || ''}" required>
            <input type="text" class="property-name" placeholder="Property Name (e.g., Code)" value="${currentValues.name || currentValues.enumName || ''}" required>
            <select class="property-default-value" onchange="handleDefaultValueChange('${rowId}')">
                <option value="">(none)</option>
                <option value="= null!;">= null!;</option>
                <option value="= String.Empty;">= String.Empty;</option>
                <option value="= [ ];">= [ ];</option>
                <option value="= new();">= new();</option>
                <option value="custom">Custom...</option>
            </select>
            <button type="button" class="btn btn-remove" onclick="removeProperty('${rowId}')">✕</button>
        `;
    }
    
    if (currentValues.defaultValue) {
        setTimeout(() => {
            const newDefaultSelect = newRow.querySelector('.property-default-value');
            if (newDefaultSelect) {
                const options = Array.from(newDefaultSelect.options).map(o => o.value);
                if (options.includes(currentValues.defaultValue)) {
                    newDefaultSelect.value = currentValues.defaultValue;
                } else {
                    const customInput = document.createElement('input');
                    customInput.type = 'text';
                    customInput.className = 'property-default-value-custom';
                    customInput.placeholder = 'e.g., = null!;';
                    customInput.value = currentValues.defaultValue;
                    newDefaultSelect.parentNode.insertBefore(customInput, newDefaultSelect);
                    newDefaultSelect.style.display = 'none';
                    
                    const revertBtn = document.createElement('button');
                    revertBtn.type = 'button';
                    revertBtn.className = 'btn btn-revert-default';
                    revertBtn.textContent = '↩';
                    revertBtn.title = 'Revert to dropdown';
                    revertBtn.onclick = function() {
                        const input = newRow.querySelector('.property-default-value-custom');
                        const sel = newRow.querySelector('.property-default-value');
                        if (input && sel) {
                            sel.style.display = '';
                            sel.value = '';
                            input.remove();
                            revertBtn.remove();
                        }
                    };
                    customInput.parentNode.insertBefore(revertBtn, customInput.nextSibling);
                }
            }
        }, 0);
    }
    
    row.parentNode.replaceChild(newRow, row);
}

// Handle default value change
function handleDefaultValueChange(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    
    const select = row.querySelector('.property-default-value');
    if (!select) return;
    
    if (select.value === 'custom') {
        const customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.className = 'property-default-value-custom';
        customInput.placeholder = 'e.g., = null!;';
        customInput.value = '= ';
        customInput.setAttribute('data-row-id', rowId);
        
        select.parentNode.insertBefore(customInput, select);
        select.style.display = 'none';
        customInput.focus();
        
        let revertBtn = row.querySelector('.btn-revert-default');
        if (!revertBtn) {
            revertBtn = document.createElement('button');
            revertBtn.type = 'button';
            revertBtn.className = 'btn btn-revert-default';
            revertBtn.textContent = '↩';
            revertBtn.title = 'Revert to dropdown';
            revertBtn.onclick = function() {
                const input = row.querySelector('.property-default-value-custom');
                const sel = row.querySelector('.property-default-value');
                if (input && sel) {
                    sel.style.display = '';
                    sel.value = '';
                    input.remove();
                    revertBtn.remove();
                }
            };
            customInput.parentNode.insertBefore(revertBtn, customInput.nextSibling);
        }
    }
}

// Add property
function addProperty(type = 'regular') {
    const row = createPropertyRow(type);
    
    if (emptyProperties.style.display !== 'none') {
        emptyProperties.style.display = 'none';
    }
    
    propertiesContainer.appendChild(row);
    updatePropertyCounter();
}

// Remove property
function removeProperty(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
        updatePropertyCounter();
        
        if (propertiesContainer.children.length === 0 || 
            (propertiesContainer.children.length === 1 && propertiesContainer.children[0].id === 'emptyProperties')) {
            emptyProperties.style.display = 'block';
        }
    }
}

// Update property counter
function updatePropertyCounter() {
    const count = propertiesContainer.querySelectorAll('.property-row').length;
    propertyCounterDiv.textContent = `${count} propert${count === 1 ? 'y' : 'ies'} added`;
}

// Add property button click
addPropertyBtn.addEventListener('click', () => addProperty('regular'));

// Select templates directory
selectTemplatesBtn.addEventListener('click', async () => {
    try {
        templatesHandle = await window.showDirectoryPicker();
        templatesPathDiv.style.display = 'block';
        templatesPathDiv.textContent = `📁 Templates: ${templatesHandle.name}`;
        
        await loadTemplates(templatesHandle);
        checkGenerateButton();
        
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error selecting templates directory:', err);
            alert('Error selecting templates directory. Please try again.');
        }
    }
});

// Select project directory
selectDirBtn.addEventListener('click', async () => {
    try {
        directoryHandle = await window.showDirectoryPicker();
        selectedPathDiv.style.display = 'block';
        selectedPathDiv.textContent = `📁 Output: ${directoryHandle.name}`;
        useFallbackZip = false;
        
        checkGenerateButton();
        localStorage.setItem('lastDirectory', directoryHandle.name);
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Error selecting directory:', err);
            alert('Error selecting directory. Please try again.');
        }
    }
});

// Enable generate button
function checkGenerateButton() {
    if (templatesHandle && (directoryHandle || useFallbackZip)) {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Files';
    }
}

// Load templates from directory
async function loadTemplates(dirHandle) {
    const requiredTemplates = [
        'Constant.hbs',
        'Domain.hbs',
        'CreateCommand.hbs',
        'CreateValidator.hbs', 
        'CreateDto.hbs',
        'UpdateCommand.hbs',
        'UpdateValidator.hbs',   
        'UpdateDto.hbs',
        'DeleteCommand.hbs',
        'DeleteValidator.hbs',
        'GetAllQuery.hbs',
        'GetByIdQuery.hbs',
        'GetPaginationQuery.hbs',
        'CommonDto.hbs',
        'Mapper.hbs',
        'InfrastructureConfiguration.hbs',
        'Controller.hbs',
        'SetStatusCommand.hbs',
        'SetStatusDto.hbs',
        'SetStatusValidator.hbs',
        'Enum.hbs',
        'CreateCommandTest.hbs',
        'UpdateCommandTest.hbs',
        'Faker.hbs',
        'DomainTest.hbs',
        'ControllerIntegrationTest.hbs'
    ];

    let loadedCount = 0;
    let errorCount = 0;
    let templateListHTML = '<div class="template-list">';

    for (const templateName of requiredTemplates) {
        try {
            const fileHandle = await dirHandle.getFileHandle(templateName);
            const file = await fileHandle.getFile();
            const content = await file.text();
            
            compiledTemplates[templateName] = Handlebars.compile(content);
            
            templateListHTML += `
                <div class="template-item">
                    <span class="status success"></span>
                    ✅ ${templateName}
                </div>`;
            loadedCount++;
        } catch (err) {
            templateListHTML += `
                <div class="template-item">
                    <span class="status error"></span>
                    ❌ ${templateName} - Not found
                </div>`;
            errorCount++;
            console.warn(`Template ${templateName} not found:`, err);
        }
    }

    templateListHTML += '</div>';
    templatesStatusDiv.innerHTML = `
        <p>Loaded ${loadedCount}/${requiredTemplates.length} templates</p>
        ${templateListHTML}
    `;

    return { loadedCount, errorCount };
}

// Collect properties from form
function collectProperties() {
    const properties = [];
    const rows = propertiesContainer.querySelectorAll('.property-row');
    
    rows.forEach(row => {
        const typeSelect = row.querySelector('.property-type-select');
        const type = typeSelect ? typeSelect.value : 'regular';
        
        let defaultValue = '';
        const defaultCustomInput = row.querySelector('.property-default-value-custom');
        const defaultSelect = row.querySelector('.property-default-value');
        
        if (defaultCustomInput) {
            defaultValue = defaultCustomInput.value.trim();
        } else if (defaultSelect) {
            defaultValue = defaultSelect.value === 'custom' ? '' : defaultSelect.value;
        }
        
        if (type === 'enum') {
            const enumNameInput = row.querySelector('.property-enum-name');
            const enumValuesInput = row.querySelector('.property-enum-values');
            
            if (enumNameInput && enumNameInput.value.trim()) {
                const enumType = enumNameInput.value.trim();
                const valuesStr = enumValuesInput ? enumValuesInput.value.trim() : '';
                const values = valuesStr ? valuesStr.split(',').map(v => v.trim().toUpperCase()) : [];
                
                properties.push({
                    isEnum: true,
                    isForeignKey: false,
                    type: enumType,
                    name: enumType,
                    camelName: enumType.charAt(0).toLowerCase() + enumType.slice(1),
                    values: values,
                    defaultValue: defaultValue
                });
            }
        } else {
            const datatypeInput = row.querySelector('.property-datatype');
            const nameInput = row.querySelector('.property-name');
            
            if (datatypeInput && nameInput && datatypeInput.value.trim() && nameInput.value.trim()) {
                const propType = datatypeInput.value.trim();
                const name = nameInput.value.trim();
                
                const isForeignKey = (type === 'foreignKey');
                
                let aggregateName = null;
                if (isForeignKey) {
                    aggregateName = propType;
                    if (aggregateName.endsWith('?')) {
                        aggregateName = aggregateName.slice(0, -1);
                    }
                    
                    const primitiveTypes = ['int', 'long', 'string', 'Guid', 'bool', 'decimal', 'double', 'float', 'DateTime'];
                    if (primitiveTypes.includes(aggregateName.toLowerCase()) || 
                        aggregateName.toLowerCase().startsWith('int') ||
                        aggregateName.toLowerCase().startsWith('long')) {
                        aggregateName = null;
                    }
                }
                
                properties.push({
                    isEnum: false,
                    isForeignKey: isForeignKey,
                    type: propType,
                    name: name,
                    camelName: name.charAt(0).toLowerCase() + name.slice(1),
                    defaultValue: defaultValue,
                    aggregateName: aggregateName
                });
            }
        }
    });
    
    return properties;
}

// Generate files
function generateFiles(formData) {
    const properties = collectProperties();
    
    const data = {
        name: formData.name,
        idType: formData.idType || 'int',
        hasStatus: formData.hasStatus,
        properties: properties,
        pluralName: pluralize(formData.name)
        
    };

    data.nonForeignKeyProperties = properties.filter(x => !x.isForeignKey);

    data.hasEnums = properties.some(p => p.isEnum);

    const foreignKeyAggregates = [...new Set(
        properties
            .filter(p => p.isForeignKey && p.aggregateName)
            .map(p => p.aggregateName)
    )];

    data.foreignKeyAggregates = foreignKeyAggregates;

    const files = [];

    function addFile(path, templateName, templateData = null) {
        if (compiledTemplates[templateName]) {
            files.push({
                path: path,
                content: compiledTemplates[templateName](templateData || data)
            });
        }
    }

    if (formData.layerDomain) {
        addFile(`Domain/Aggregates/${data.name}Aggregate/${data.name}.cs`, 'Domain.hbs');
        
        data.properties.forEach(prop => {
            if (prop.isEnum && prop.type) {
                addFile(
                    `Domain/Aggregates/${data.name}Aggregate/Enums/${prop.type}.cs`,
                    'Enum.hbs',
                    { name: data.name, enumType: prop.type, enumValues: prop.values || [] }
                );
            }
        });
    }

    if (formData.layerApplication) {
        addFile(`Application/Common/Utils/Constants/${data.name}Constant.cs`, 'Constant.hbs');
        addFile(`Application/Features/${data.pluralName}/Commands/Create/Create${data.name}Command.cs`, 'CreateCommand.hbs');
        addFile(`Application/Features/${data.pluralName}/Commands/Create/Create${data.name}Dto.cs`, 'CreateDto.hbs');
        addFile(`Application/Features/${data.pluralName}/Commands/Create/Create${data.name}CommandValidator.cs`, 'CreateValidator.hbs');
        addFile(`Application/Features/${data.pluralName}/Commands/Update/Update${data.name}Command.cs`, 'UpdateCommand.hbs');
        addFile(`Application/Features/${data.pluralName}/Commands/Update/Update${data.name}Dto.cs`, 'UpdateDto.hbs');
        addFile(`Application/Features/${data.pluralName}/Commands/Update/Update${data.name}CommandValidator.cs`, 'UpdateValidator.hbs');
        addFile(`Application/Features/${data.pluralName}/Commands/Delete/Delete${data.name}Command.cs`, 'DeleteCommand.hbs');
        addFile(`Application/Features/${data.pluralName}/Commands/Delete/Delete${data.name}CommandValidator.cs`, 'DeleteValidator.hbs');
        addFile(`Application/Features/${data.pluralName}/Queries/GetAll/GetAll${data.name}Query.cs`, 'GetAllQuery.hbs');
        addFile(`Application/Features/${data.pluralName}/Queries/GetById/GetById${data.name}Query.cs`, 'GetByIdQuery.hbs');
        addFile(`Application/Features/${data.pluralName}/Queries/GetPagination/GetPagination${data.name}Query.cs`, 'GetPaginationQuery.hbs');
        addFile(`Application/Features/${data.pluralName}/Common/Dtos/${data.name}Dto.cs`, 'CommonDto.hbs');
        addFile(`Application/Features/${data.pluralName}/Common/Mappers/${data.name}MappingProfile.cs`, 'Mapper.hbs');

        if (data.hasStatus) {
            addFile(`Application/Features/${data.pluralName}/Commands/SetStatus/SetStatus${data.name}Command.cs`, 'SetStatusCommand.hbs');
            addFile(`Application/Features/${data.pluralName}/Commands/SetStatus/SetStatus${data.name}Dto.cs`, 'SetStatusDto.hbs');
            addFile(`Application/Features/${data.pluralName}/Commands/SetStatus/SetStatus${data.name}CommandValidator.cs`, 'SetStatusValidator.hbs');
        }
    }

    if (formData.layerInfrastructure) {
        addFile(`Infrastructure/Configurations/${data.name}Configuration.cs`, 'InfrastructureConfiguration.hbs');
    }

    if (formData.layerWebApi) {
        addFile(`WebApi/Controllers/${data.name}Controller.cs`, 'Controller.hbs');
    }

    if (formData.testDomain || formData.testApplication || formData.testIntegration) {
        if (formData.testDomain) {
            addFile(`tests/Domain.Test/Aggregates/${data.name}DomainTests.cs`, 'DomainTest.hbs');
        }
        
        if (formData.testApplication) {
            addFile(`tests/Application.Test/Functionals/${data.pluralName}/Commands/Create${data.name}CommandTests.cs`, 'CreateCommandTest.hbs');
            addFile(`tests/Application.Test/Functionals/${data.pluralName}/Commands/Update${data.name}CommandTests.cs`, 'UpdateCommandTest.hbs');
        }
        
        if (formData.testIntegration) {
            addFile(`tests/Integration.Test/Tests/${data.name}ControllerIntegrationTests.cs`, 'ControllerIntegrationTest.hbs');
        }
        
        addFile(`tests/Test.Shared/AggregateUtils/${data.name}Fakers/${data.name}Faker.cs`, 'Faker.hbs');
    }

    return { files, data };
}

// Write file recursively
async function writeFileRecursive(rootHandle, filePath, content) {
    const parts = filePath.split('/');
    let currentHandle = rootHandle;
    
    for (let i = 0; i < parts.length - 1; i++) {
        const dirName = parts[i];
        try {
            currentHandle = await currentHandle.getDirectoryHandle(dirName, { create: true });
        } catch (err) {
            console.error(`Error creating directory ${dirName}:`, err);
            throw err;
        }
    }
    
    const fileName = parts[parts.length - 1];
    const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
}

// Write files to directory
async function writeFilesToDirectory(files) {
    const writtenFiles = [];
    
    for (const file of files) {
        try {
            await writeFileRecursive(directoryHandle, file.path, file.content);
            writtenFiles.push(file.path);
        } catch (err) {
            console.error(`Error writing ${file.path}:`, err);
            throw new Error(`Failed to write ${file.path}: ${err.message}`);
        }
    }
    
    return writtenFiles;
}

// Download as ZIP
async function downloadAsZip(files) {
    if (typeof JSZip === 'undefined') {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    const zip = new JSZip();
    files.forEach(file => zip.file(file.path, file.content));
    const content = await zip.generateAsync({ type: 'blob' });
    
    if (typeof saveAs === 'undefined') {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    saveAs(content, 'generated-files.zip');
}

// Display results
function displayResults(files, data, writtenFiles) {
    const output = document.getElementById('output');
    
    let html = `
        <div class="card">
            <div class="success-message">
                <h2 style="margin-bottom: 1rem;">✅ Files Generated Successfully!</h2>
                <p><strong>Aggregate:</strong> ${data.name}</p>
    `;
    
    if (directoryHandle) {
        html += `<p><strong>Directory:</strong> ${directoryHandle.name}</p>`;
    }
    
    html += `
                <div class="stats">
                    <div class="stat-item">
                        <div class="stat-number">${files.length}</div>
                        <div class="stat-label">Files Created</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${data.properties.length}</div>
                        <div class="stat-label">Properties</div>
                    </div>
                </div>
                <div class="file-list">
                    ${writtenFiles.map(file => `<div class="file-item">📄 ${file}</div>`).join('')}
                </div>
            </div>
        </div>
    `;
    
    output.innerHTML = html;
}

// Form submission
generatorForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const loading = document.getElementById('loading');
    const output = document.getElementById('output');
    
    if (Object.keys(compiledTemplates).length === 0) {
        alert('Please select the templates directory first!');
        return;
    }
    
    const properties = collectProperties();
    if (properties.length === 0) {
        alert('Please add at least one property!');
        return;
    }
    
    const layerDomain = document.getElementById('layerDomain').checked;
    const layerInfrastructure = document.getElementById('layerInfrastructure').checked;
    const layerApplication = document.getElementById('layerApplication').checked;
    const layerWebApi = document.getElementById('layerWebApi').checked;
    const testDomain = document.getElementById('testDomain').checked;
    const testApplication = document.getElementById('testApplication').checked;
    const testIntegration = document.getElementById('testIntegration').checked;

    if (!layerDomain && !layerInfrastructure && !layerApplication && !layerWebApi && 
        !testDomain && !testApplication && !testIntegration) {
        alert('Please select at least one layer or test to generate!');
        return;
    }
    
    loading.classList.add('active');
    output.innerHTML = '';
    generateBtn.disabled = true;
    
    try {
        const formData = {
            name: document.getElementById('name').value,
            idType: document.getElementById('idType').value,
            hasStatus: document.getElementById('hasStatus').checked,
            layerDomain, layerInfrastructure, layerApplication, layerWebApi,
            testDomain, testApplication, testIntegration
        };
        
        const { files, data } = generateFiles(formData);
        
        let writtenFiles = [];
        
        if (directoryHandle && !useFallbackZip) {
            writtenFiles = await writeFilesToDirectory(files);
        } else {
            await downloadAsZip(files);
            writtenFiles = files.map(f => f.path);
        }
        
        displayResults(files, data, writtenFiles);
        
    } catch (error) {
        console.error('Generation error:', error);
        output.innerHTML = `
            <div class="card">
                <div class="error-message">
                    <h2>❌ Error</h2>
                    <p>${error.message}</p>
                </div>
            </div>
        `;
    } finally {
        loading.classList.remove('active');
        generateBtn.disabled = false;
    }
});

// Fill example
function fillExample() {
    document.getElementById('name').value = 'Product';
    
    propertiesContainer.innerHTML = '';
    propertiesContainer.appendChild(emptyProperties);
    emptyProperties.style.display = 'none';
    
    const examples = [
        { type: 'regular', datatype: 'string', name: 'Code' },
        { type: 'regular', datatype: 'string', name: 'Name' },
        { type: 'regular', datatype: 'decimal', name: 'Price' },
        { type: 'enum', enumName: 'Category', enumValues: 'Electronics,Clothing,Food' }
    ];
    
    examples.forEach(example => {
        const row = createPropertyRow(example.type);
        if (example.type === 'enum') {
            row.querySelector('.property-enum-name').value = example.enumName;
            row.querySelector('.property-enum-values').value = example.enumValues;
        } else {
            row.querySelector('.property-datatype').value = example.datatype;
            row.querySelector('.property-name').value = example.name;
        }
        propertiesContainer.appendChild(row);
    });
    
    updatePropertyCounter();
}

const exampleBtn = document.createElement('button');
exampleBtn.textContent = '📝 Fill Example';
exampleBtn.type = 'button';
exampleBtn.className = 'btn';
exampleBtn.style.cssText = 'margin-top: 1rem; background: #6b7280;';
exampleBtn.onclick = fillExample;
generatorForm.appendChild(exampleBtn);