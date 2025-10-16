// Load tournaments from LocalStorage
function loadTournaments() {
    return JSON.parse(localStorage.getItem('tournaments')) || [];
}

// Save tournaments to LocalStorage
function saveTournaments(tournaments) {
    localStorage.setItem('tournaments', JSON.stringify(tournaments));
}

// index.html: Load and display tournaments
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('tournament-list')) { // Only on index.html
        const tournaments = loadTournaments();
        const tournamentList = document.getElementById('tournament-list');
        tournamentList.innerHTML = ''; // Clear existing
        tournaments.forEach(tournament => {
            const card = document.createElement('div');
            card.className = 'tournament-card';
            card.innerHTML = `
                <h4>${tournament.name}</h4>
                <p>Format: ${tournament.format}</p>
                <p>Teams: ${tournament.numberOfTeams}</p>
                <p>Status: ${tournament.status}</p>
            `;
            card.addEventListener('click', () => {
                window.location.href = `tournament.html?id=${tournament.id}`;
            });
            tournamentList.appendChild(card);
        });
    }

    // create.html: Handle form submission
    if (document.getElementById('tournament-form')) { // Only on create.html
        const form = document.getElementById('tournament-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const tournaments = loadTournaments();
            const newTournament = {
                id: Date.now(), // Unique ID using timestamp
                name: document.getElementById('name').value,
                format: document.getElementById('format').value,
                numberOfTeams: document.getElementById('numberOfTeams').value,
                status: document.getElementById('status').value
            };
            tournaments.push(newTournament);
            saveTournaments(tournaments);
            window.location.href = 'index.html'; // Redirect to home
        });
    }

    // tournament.html: Load and display tournament details
    if (document.getElementById('tournament-info')) { // Only on tournament.html
        const urlParams = new URLSearchParams(window.location.search);
        const id = parseInt(urlParams.get('id'));
        const tournaments = loadTournaments();
        const tournament = tournaments.find(t => t.id === id);
        
        if (tournament) {
            const infoDiv = document.getElementById('tournament-info');
            infoDiv.innerHTML = `
                <h3>${tournament.name}</h3>
                <p>Format: ${tournament.format}</p>
                <p>Number of Teams: ${tournament.numberOfTeams}</p>
                <p>Status: ${tournament.status}</p>
                <hr>
            `;
            
            let placeholder = '';
            if (tournament.format === 'Knockout') {
                placeholder = 'Knockout Bracket (coming soon...)';
            } else if (tournament.format === 'League (Home & Away)') {
                placeholder = 'League Table (coming soon...)';
            } else if (tournament.format === 'Group + Knockout') {
                placeholder = 'Group Stage and Knockout (coming soon...)';
            }
            infoDiv.innerHTML += `<p>${placeholder}</p>`;
        } else {
            document.getElementById('tournament-info').innerHTML = '<p>Tournament not found.</p>';
        }
    }
});
