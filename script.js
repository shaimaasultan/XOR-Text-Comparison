let previousText1 = '';
let previousText2 = '';
let initialText1 = null;
let initialText2 = null;

// On page load, make sure both undo buttons are disabled
window.addEventListener('DOMContentLoaded', disableMergeButtonsIfEmptyOnLoad);


// Remove the window.addEventListener block
document.addEventListener('keydown', function(e) {
  if (e.altKey && e.key === '1') document.getElementById('text1').focus();
  if (e.altKey && e.key === '2') document.getElementById('text2').focus();
  if (e.altKey && e.key === 'c') compareTexts();
  if (e.altKey && e.key === 'm') mergeModifiedToOriginal();
  if (e.altKey && e.key === 'o') mergeOriginalToModified();
  if (e.altKey && e.key === 'u') undoMerge();
  if (e.altKey && e.key === 'h') clearHighlights();
});

function exportText(boxId) {
  const text = document.getElementById(boxId).innerText;
  const filename = boxId === 'text1' ? 'original_text.txt' : 'modified_text.txt';
  const blob = new Blob([text], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function disableMergeButtonsIfEmptyOnLoad() {
  const text1 = document.getElementById('text1').innerText.trim();
  const text2 = document.getElementById('text2').innerText.trim();
  document.getElementById('undoMergeOriginalBtn').disabled = true;
  document.getElementById('undoMergeModifiedBtn').disabled = true;
  const btnOriginalToModified = document.querySelector('button[onclick="mergeOriginalToModified()"]');
  const btnModifiedToOriginal = document.querySelector('button[onclick="mergeModifiedToOriginal()"]');
  const shouldDisable = (!text1 && !text2);
  btnOriginalToModified.disabled = shouldDisable;
  btnModifiedToOriginal.disabled = shouldDisable;
}

function resetPage() {
  // Clear both text boxes
  document.getElementById('text1').innerHTML = '';
  document.getElementById('text2').innerHTML = '';
  // Reset initial and previous text variables
  previousText1 = '';
  previousText2 = '';
  initialText1 = null;
  initialText2 = null;
  currentMerge = null;
  // Clear analysis
  const analysisBox = document.getElementById('analysisBox');
  if (analysisBox) analysisBox.innerHTML = '';
  // Reset mode
  setMode('Idle');
  // Reset toggles and exclude
  document.getElementById('ignoreCase').checked = false;
  document.getElementById('ignorePunctuation').checked = false;
  document.getElementById('compareSentences').checked = false;
  document.getElementById('excludeChars').value = '';
  // Show text container if hidden
  const container = document.getElementById('textContainer');
  container.style.display = 'flex';
  document.getElementById('toggleTextBtn').textContent = 'Hide Text';
   // Update merge buttons state
  disableMergeButtonsIfEmptyOnLoad();
}
// Run this on page
// Run this on page
function setInitialTextsIfNeeded() {
  if (initialText1 === null) {
    initialText1 = document.getElementById('text1').innerHTML;
  }
  if (initialText2 === null) {
    initialText2 = document.getElementById('text2').innerHTML;
  }
}
let currentMerge = null;

function setMergeButtonsState(isMergeMode) {
  const btnOriginalToModified = document.querySelector('button[onclick="mergeOriginalToModified()"]');
  const btnModifiedToOriginal = document.querySelector('button[onclick="mergeModifiedToOriginal()"]');
  if (isMergeMode) {
    if (currentMerge === 'originalToModified') {
      btnOriginalToModified.disabled = false;
      btnModifiedToOriginal.disabled = true;
    } else if (currentMerge === 'modifiedToOriginal') {
      btnOriginalToModified.disabled = true;
      btnModifiedToOriginal.disabled = false;
    }
  } else {
    btnOriginalToModified.disabled = false;
    btnModifiedToOriginal.disabled = false;
  }
}

// Show/hide loading spinner
function showLoading() {
  document.getElementById('loadingSpinner').style.display = 'block';
}
function hideLoading() {
  document.getElementById('loadingSpinner').style.display = 'none';
}



function getOptions() {
  return {
    ignoreCase: document.getElementById('ignoreCase').checked,
    ignorePunctuation: document.getElementById('ignorePunctuation').checked,
    compareSentences: document.getElementById('compareSentences').checked,
    excludeChars: document.getElementById('excludeChars').value.split('').filter(c => c.trim())
  };
}

function cleanWord(word, options) {
  let cleaned = word.replace(/<[^>]*>/g, ''); // remove HTML tags
  if (options.ignorePunctuation) {
    cleaned = cleaned.replace(/[^\w\d\s]/g, '');
  }
  if (options.excludeChars.length) {
    options.excludeChars.forEach(char => {
      cleaned = cleaned.split(char).join('');
    });
  }
  if (options.ignoreCase) {
    cleaned = cleaned.toLowerCase();
  }
  return cleaned.trim();
}

function splitText(text, options) {
  return options.compareSentences
    ? text.split(/(?<=[.!?])\s+/)
    : text.split(/\s+/);
}

function analyzeDiffs() {
  const options = getOptions();

  // Remove highlights for analysis
  const rawOriginal = document.getElementById('text1').innerHTML.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
  const rawModified = document.getElementById('text2').innerHTML.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');

  const originalWords = splitText(rawOriginal, options);
  const modifiedWords = splitText(rawModified, options);

  const cleanOriginal = originalWords.map(w => cleanWord(w, options));
  const cleanModified = modifiedWords.map(w => cleanWord(w, options));

  const originalSet = new Set(cleanOriginal);
  const modifiedSet = new Set(cleanModified);

  // KPIs
  const totalOriginal = cleanOriginal.length;
  const totalModified = cleanModified.length;
  const commonWords = cleanOriginal.filter(w => modifiedSet.has(w)).length;
  const originalOnly = cleanOriginal.filter(w => !modifiedSet.has(w)).length;
  const modifiedOnly = cleanModified.filter(w => !originalSet.has(w)).length;
  const diffWords = originalOnly + modifiedOnly;
  const jaccard = commonWords / (originalSet.size + modifiedSet.size - commonWords);

  // Flipped table layout with export button in intersection cell
  let analysisHtml = `
    <table class="analysis-kpi-table">
      <thead>
        <tr>
          <th>
            <!-- In your analysis table header cell: -->
            <button onclick="exportAnalysis()" aria-label="Export Analysis" class="export-btn-table" tabindex="0">
                <span style="vertical-align:middle;">💾</span> Export Analysis
                <span class="export-tooltip" role="tooltip">Analysis must exist to export.</span>
            </button>
          </th>
          <th>Word count</th>
          <th>Unique words</th>
          <th>Jaccard similarity</th>
          <th>Total diff words</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><b>Original text</b></td>
          <td>${totalOriginal}</td>
          <td><span class="gold">${originalOnly}</span></td>
          <td rowspan="3" style="vertical-align: middle;">${(jaccard * 100).toFixed(2)}%</td>
          <td rowspan="3" style="vertical-align: middle;">${diffWords}</td>
        </tr>
        <tr>
          <td><b>Modified text</b></td>
          <td>${totalModified}</td>
          <td><span class="blue">${modifiedOnly}</span></td>
        </tr>
        <tr>
          <td><b>In Both</b></td>
          <td>-</td>
          <td><span class="merged">${commonWords}</span></td>
        </tr>
      </tbody>
    </table>
  `;

  // Add or update analysis box
  let analysisBox = document.getElementById('analysisBox');
  if (!analysisBox) {
    analysisBox = document.createElement('div');
    analysisBox.id = 'analysisBox';
    analysisBox.className = 'analysis-box';
    document.body.insertBefore(analysisBox, document.getElementById('textContainer'));
  }
  analysisBox.innerHTML = analysisHtml;
}
// Call analyzeDiffs after compareTexts
async function compareTexts() {
  showLoading();
  await new Promise(resolve => setTimeout(resolve, 50)); // allow spinner to show

  setMode('Compare Mode');
  setInitialTextsIfNeeded();
  previousText1 = document.getElementById('text1').innerHTML;
  previousText2 = document.getElementById('text2').innerHTML;

  const options = getOptions();

  // Remove all existing highlights before comparing
  const rawOriginal = document.getElementById('text1').innerHTML.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
  const rawModified = document.getElementById('text2').innerHTML.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');

  const originalWords = splitText(rawOriginal, options);
  const modifiedWords = splitText(rawModified, options);

  const cleanOriginal = originalWords.map(w => cleanWord(w, options));
  const cleanModified = modifiedWords.map(w => cleanWord(w, options));

  const originalSet = new Set(cleanOriginal);
  const modifiedSet = new Set(cleanModified);

  const highlight = (words, otherSet, cssClass, cleanList) => {
    return words.map((word, i) => {
      const plain = cleanList[i];
      if (plain && !otherSet.has(plain)) {
        return `<span class="${cssClass}">${word}</span>`;
      }
      return word;
    });
  };

  const highlightedOriginal = highlight(originalWords, modifiedSet, 'gold', cleanOriginal);
  const highlightedModified = highlight(modifiedWords, originalSet, 'blue', cleanModified);

  document.getElementById('text1').innerHTML = highlightedOriginal.join(' ');
  document.getElementById('text2').innerHTML = highlightedModified.join(' ');
  
  hideLoading();
  analyzeDiffs();
}

function mergeTexts(sourceId, targetId, highlightColor) {
  setMode('Merge Mode');
  previousText1 = document.getElementById('text1').innerHTML;
  previousText2 = document.getElementById('text2').innerHTML;

  const options = getOptions();
  const sourceWords = splitText(document.getElementById(sourceId).innerHTML, options);
  const targetWords = splitText(document.getElementById(targetId).innerHTML, options);

  const sourceSet = new Set(sourceWords.map(w => cleanWord(w, options)));
  let merged = [...sourceWords];

  targetWords.forEach(word => {
    const plain = cleanWord(word, options);
    if (plain && !sourceSet.has(plain)) {
      merged.push(`<span class="merge-highlight" style="background-color: ${highlightColor};">${word}</span>`);
    }
  });

  document.getElementById(sourceId).innerHTML = merged.join(' ');
}

function mergeModifiedToOriginal() {
  // Prevent merging if already in Merge Mode
  if (document.getElementById('currentMode').textContent === 'Merge Mode') return;
  currentMerge = 'modifiedToOriginal';
  setMergeButtonsState(true);
  setMode('Merge Mode');
  previousText1 = document.getElementById('text1').innerHTML;
  previousText2 = document.getElementById('text2').innerHTML;
  const options = getOptions();

  // Remove all existing highlights before merging
  const rawOriginal = document.getElementById('text1').innerHTML.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
  const rawModified = document.getElementById('text2').innerHTML.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');

  const originalWords = splitText(rawOriginal, options);
  const modifiedWords = splitText(rawModified, options);

  const cleanOriginal = originalWords.map(w => cleanWord(w, options));
  const cleanModified = modifiedWords.map(w => cleanWord(w, options));

  const originalSet = new Set(cleanOriginal);
  const modifiedSet = new Set(cleanModified);

  let merged = [];

  // Add all original words, update highlight
  originalWords.forEach((word, i) => {
    const cleaned = cleanOriginal[i];
    if (modifiedSet.has(cleaned)) {
      merged.push(`<span class="merged">${word}</span>`);
    } else {
      merged.push(`<span class="gold">${word}</span>`);
    }
  });

  // Add words only in modified
  modifiedWords.forEach((word, i) => {
    const cleaned = cleanModified[i];
    if (!originalSet.has(cleaned)) {
      merged.push(`<span class="blue">${word}</span>`);
    }
  });

  document.getElementById('text1').innerHTML = merged.join(' ');
}

function mergeOriginalToModified() {
  // Prevent merging if already in Merge Mode
  if (document.getElementById('currentMode').textContent === 'Merge Mode') return;
  currentMerge = 'originalToModified';
  setMergeButtonsState(true);
  setMode('Merge Mode');
  previousText1 = document.getElementById('text1').innerHTML;
  previousText2 = document.getElementById('text2').innerHTML;
  const options = getOptions();

  // Remove all existing highlights before merging
  const rawOriginal = document.getElementById('text1').innerHTML.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
  const rawModified = document.getElementById('text2').innerHTML.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');

  const originalWords = splitText(rawOriginal, options);
  const modifiedWords = splitText(rawModified, options);

  const cleanOriginal = originalWords.map(w => cleanWord(w, options));
  const cleanModified = modifiedWords.map(w => cleanWord(w, options));

  const originalSet = new Set(cleanOriginal);
  const modifiedSet = new Set(cleanModified);

  let merged = [];

  // Add all modified words, update highlight
  modifiedWords.forEach((word, i) => {
    const cleaned = cleanModified[i];
    if (originalSet.has(cleaned)) {
      merged.push(`<span class="merged">${word}</span>`);
    } else {
      merged.push(`<span class="blue">${word}</span>`);
    }
  });

  // Add words only in original
  originalWords.forEach((word, i) => {
    const cleaned = cleanOriginal[i];
    if (!modifiedSet.has(cleaned)) {
      merged.push(`<span class="gold">${word}</span>`);
    }
  });

  document.getElementById('text2').innerHTML = merged.join(' ');
}


function mergeHighlights(targetDiv, sourceDiv) {
  const options = getOptions();

  // Get cleaned words for both texts
  const targetWords = Array.from(targetDiv.childNodes).map(node => node.textContent);
  const sourceWords = Array.from(sourceDiv.childNodes).map(node => node.textContent);

  const cleanTarget = targetWords.map(w => cleanWord(w, options));
  const cleanSourceSet = new Set(sourceWords.map(w => cleanWord(w, options)));

  // Loop through spans and update classes
  let spanIdx = 0;
  targetDiv.childNodes.forEach((node, i) => {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
      const cleaned = cleanTarget[i];
      if (cleaned && cleanSourceSet.has(cleaned)) {
        node.classList.remove('gold', 'blue');
        node.classList.add('merged');
      } else if (node.classList.contains('gold')) {
        node.classList.remove('merged', 'blue');
        node.classList.add('gold');
      } else if (node.classList.contains('blue')) {
        node.classList.remove('merged', 'gold');
        node.classList.add('blue');
      }
      spanIdx++;
    }
  });
}


function undoMerge() {
  document.getElementById('text1').innerHTML = initialText1;
  document.getElementById('text2').innerHTML = initialText2;
  setMode('Undo Merge');
  setMode('Idle');
}

function toggleText() {
  const container = document.getElementById('textContainer');
  container.style.display = container.style.display === 'none' ? 'flex' : 'none';
  document.getElementById('toggleTextBtn').textContent =
    container.style.display === 'none' ? 'Show Text' : 'Hide Text';
}
function clearHighlights() {
  const ids = ['text1', 'text2'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = el.innerHTML.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
    }
  });
  setMode('Idle');
}

function exportText(boxId) {
  const text = document.getElementById(boxId).innerText.trim();
  if (!text) {
    alert("Cannot export: The text box is empty.");
    return;
  }
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0,19);
  const filename = (boxId === 'text1' ? 'original_text_' : 'modified_text_') + timestamp + '.txt';
  const blob = new Blob([text], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportAnalysis() {
  const analysisBox = document.getElementById('analysisBox');
  if (!analysisBox) {
    alert("Cannot export: The analysis is empty.");
    return;
  }
  const table = analysisBox.querySelector('table');
  let text = '';
  if (table) {
    for (const row of table.rows) {
      let rowText = [];
      for (const cell of row.cells) {
        rowText.push(cell.textContent.trim());
      }
      text += rowText.join('\t') + '\n';
    }
  } else {
    text = analysisBox.innerText.trim();
  }
  if (!text || text.replace(/\s/g, '') === '') {
    alert("Cannot export: The analysis is empty.");
    return;
  }
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0,19);
  const filename = 'analysis_' + timestamp + '.txt';
  const blob = new Blob([text], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function setMode(mode) {
  document.getElementById('currentMode').textContent = mode;
  const undoOriginalBtn = document.querySelector('button[id="undoMergeModifiedBtn"]');
  const undoModifiedBtn = document.querySelector('button[id="undoMergeOriginalBtn"]');
  undoOriginalBtn.disabled = true;
  undoModifiedBtn.disabled = true;
  if (mode === 'Merge Mode') {
    setMergeButtonsState(true);
   
    if (currentMerge === 'originalToModified') {
      undoOriginalBtn.disabled = false;
      undoModifiedBtn.disabled = true;
    } else if (currentMerge === 'modifiedToOriginal') {
      undoOriginalBtn.disabled = true;
      undoModifiedBtn.disabled = false;
    } else {
      undoOriginalBtn.disabled = true;
      undoModifiedBtn.disabled = true;
    }
  } else {
    currentMerge = null;
    setMergeButtonsState(false);
    undoOriginalBtn.disabled = true;
    undoModifiedBtn.disabled = true;
  }
}

function highlightText() {
  const input = document.getElementById("searchTerm").value.trim();
  const box = document.getElementById("searchBox").value;
  const exactMatch = document.getElementById("exactMatch").checked;
  const caseSensitive = document.getElementById("caseSensitive").checked;
  const targetId = box === "original" ? "text1" : "text2"; // Replace with actual IDs
  const targetBox = document.getElementById(targetId);

  if (!input || !targetBox) return;

  // Remove previous highlights
  targetBox.innerHTML = targetBox.textContent;

  // Split input into array of terms
  const terms = input.split(",").map(term => term.trim()).filter(term => term.length > 0);
  if (terms.length === 0) return;

  // Build regex pattern
  const pattern = terms.map(term => {
    const escaped = escapeRegExp(term);
    return exactMatch ? `\\b${escaped}\\b` : escaped;
  }).join("|");

  const flags = caseSensitive ? "g" : "gi";
  const regex = new RegExp(`(${pattern})`, flags);

  // Highlight matches
  targetBox.innerHTML = targetBox.innerHTML.replace(regex, `<span class="search-container">$1</span>`);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toggleAnalysis() {
    const box = document.getElementById("analysisBox");
    if (box.style.display === "none" || box.style.display === "") {
      box.style.display = "block";
    } else {
      box.style.display = "none";
    }
  }
