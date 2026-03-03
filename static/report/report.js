document.addEventListener('DOMContentLoaded', () => {
    const historyData = [
        { date: 'Jan 07, 2026', source: 'EEG File', emotion: 'Calm', score: '94%' },
        { date: 'Jan 05, 2026', source: 'Live Stream', emotion: 'Focused', score: '89%' },
        { date: 'Jan 04, 2026', source: 'Facial Image', emotion: 'Happy', score: '76%' },
        { date: 'Jan 02, 2026', source: 'EEG File', emotion: 'Stressed', score: '62%' }
    ];

    const tableBody = document.getElementById('history-body');

    historyData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.date}</td>
            <td><span class="tag">${item.source}</span></td>
            <td class="font-bold">${item.emotion}</td>
            <td>${item.score}</td>
        `;
        tableBody.appendChild(row);
    });
});

function logout() {
  localStorage.removeItem("loggedIn");
  window.location.href = "../../templates/index/index.html";
}