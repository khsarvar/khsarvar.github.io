function activateTab(tabId) {
    const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (!btn) return;

    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    document.getElementById(tabId).classList.add('active');
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        activateTab(btn.dataset.tab);
        history.replaceState(null, '', `#${btn.dataset.tab}`);
    });
});

document.querySelectorAll('[data-tab-link]').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        activateTab(link.dataset.tabLink);
        history.replaceState(null, '', `#${link.dataset.tabLink}`);
        window.scrollTo(0, 0);
    });
});

const hash = location.hash.slice(1);
if (hash) activateTab(hash);
