// Data structure for voting categories
const votingConfig = {
    algemeneThemas: {
        title: "Algemene Thema's",
        description: "Selecteer je top 3 algemene thema's",
        maxVotes: 3,
        color: "blue"
    },
    rondeThemas: {
        title: "Ronde Thema's",
        description: "Selecteer je top 15 ronde thema's",
        maxVotes: 15,
        color: "green"
    },
    tafelrondes: {
        title: "Tafelrondes",
        description: "Selecteer je top 5 tafelrondes",
        maxVotes: 5,
        color: "purple"
    },
    schiftingsvragen: {
        title: "Schiftingsvragen",
        description: "Selecteer je top 2 schiftingsvragen",
        maxVotes: 2,
        color: "orange"
    }
};

let currentUser = null;
let currentCategory = null;
let selectedVotes = [];
let users = [];
let votingData = {};

// Load JSON data
async function loadData() {
    try {
        const [usersResponse, algemeneThemasResponse, rondeThemasResponse, tafelrondesResponse, schiftingsvragenResponse] = await Promise.all([
            fetch('users.json'),
            fetch('algemene-themas.json'),
            fetch('ronde-themas.json'),
            fetch('tafelrondes.json'),
            fetch('schiftingsvragen.json')
        ]);

        users = await usersResponse.json();
        votingData.algemeneThemas = (await algemeneThemasResponse.json()).map(item => item.name);
        votingData.rondeThemas = (await rondeThemasResponse.json()).map(item => item.name);
        votingData.tafelrondes = (await tafelrondesResponse.json()).map(item => item.name);
        votingData.schiftingsvragen = (await schiftingsvragenResponse.json()).map(item => item.name);

        populateUserSelect();
        setupEventListeners();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Fout bij het laden van de data. Controleer of de JSON bestanden bestaan.');
    }
}

// Initialize the application
function init() {
    loadData();
}

function populateUserSelect() {
    const userSelect = document.getElementById('userSelect');
    userSelect.innerHTML = '<option value="">Kies een gebruiker...</option>';
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        userSelect.appendChild(option);
    });
}

function setupEventListeners() {
    document.getElementById('startVoting').addEventListener('click', startVoting);
    document.getElementById('backToDashboard').addEventListener('click', showDashboard);
    document.getElementById('submitVotes').addEventListener('click', submitVotes);
    document.getElementById('backToDashboardFromSuccess').addEventListener('click', showDashboard);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    document.querySelectorAll('.voting-option').forEach(button => {
        button.addEventListener('click', () => {
            currentCategory = button.dataset.category;
            showVotingScreen(currentCategory);
        });
    });
}

function startVoting() {
    const userId = document.getElementById('userSelect').value;
    if (!userId) {
        alert('Selecteer eerst een gebruiker');
        return;
    }
    currentUser = users.find(u => u.id === parseInt(userId));
    showDashboard();
}

function showDashboard() {
    document.getElementById('userSelection').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('votingScreen').classList.add('hidden');
    document.getElementById('successMessage').classList.add('hidden');
    document.getElementById('currentUserDisplay').textContent = currentUser.name;
}

function showVotingScreen(category) {
    const config = votingConfig[category];
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('votingScreen').classList.remove('hidden');
    document.getElementById('votingTitle').textContent = config.title;
    document.getElementById('votingDescription').textContent = config.description;
    
    selectedVotes = [];
    renderVotingOptions(category, config.maxVotes);
}

function renderVotingOptions(category, maxVotes) {
    const container = document.getElementById('votingOptions');
    container.innerHTML = '';
    
    votingData[category].forEach((option, index) => {
        const div = document.createElement('div');
        div.className = 'flex items-center p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition duration-200 cursor-pointer';
        div.innerHTML = `
            <input type="checkbox" id="option-${index}" value="${option}" 
                class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer">
            <label for="option-${index}" class="ml-4 flex-1 cursor-pointer text-gray-700 font-medium">${option}</label>
            <span class="vote-rank bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold hidden"></span>
        `;
        
        const checkbox = div.querySelector('input');
        checkbox.addEventListener('change', () => handleVoteChange(option, checkbox, maxVotes));
        
        // Make the whole div clickable
        div.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
        
        container.appendChild(div);
    });
}

function handleVoteChange(option, checkbox, maxVotes) {
    if (checkbox.checked) {
        if (selectedVotes.length >= maxVotes) {
            checkbox.checked = false;
            alert(`Je mag maximaal ${maxVotes} opties selecteren`);
            return;
        }
        selectedVotes.push(option);
    } else {
        selectedVotes = selectedVotes.filter(v => v !== option);
    }
    
    updateVoteRanks();
}

function updateVoteRanks() {
    const ranks = document.querySelectorAll('.vote-rank');
    ranks.forEach(rank => {
        rank.textContent = '';
        rank.classList.add('hidden');
    });
    
    selectedVotes.forEach((vote, index) => {
        const checkbox = document.querySelector(`input[value="${vote}"]`);
        if (checkbox) {
            const rankSpan = checkbox.parentElement.querySelector('.vote-rank');
            rankSpan.textContent = `#${index + 1}`;
            rankSpan.classList.remove('hidden');
        }
    });
}

// CONFIGURATION: Replace this URL with your Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxFUNLAK5GdxCDw4HAY4_uZxkizYCiKlsTBFgiQBGlj43EjhG_u6B5AEIoy48Pto3K9lw/exec';

function submitVotes() {
    if (selectedVotes.length === 0) {
        alert('Selecteer minimaal één optie');
        return;
    }
    
    // Prepare the vote data
    const voteData = {
        user: currentUser,
        category: currentCategory,
        votes: selectedVotes,
        timestamp: new Date().toISOString()
    };
    
    console.log('Submitting votes:', voteData);
    
    // Show loading state
    const submitBtn = document.getElementById('submitVotes');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Bezig met opslaan...';
    submitBtn.disabled = true;
    
    // Send data to Google Apps Script
    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(voteData)
    })
    .then(() => {
        // Show success message (no-cors mode doesn't return readable response)
        document.getElementById('votingScreen').classList.add('hidden');
        document.getElementById('successMessage').classList.remove('hidden');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Er is een fout opgetreden bij het opslaan. Probeer opnieuw.');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    });
}

function logout() {
    currentUser = null;
    document.getElementById('userSelect').value = '';
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('userSelection').classList.remove('hidden');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
