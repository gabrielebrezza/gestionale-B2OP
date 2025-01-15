function toggleChangeTheme() {
    const currentTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    changeTheme(currentTheme);
}

function changeTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark');
        document.querySelector('.themeMode span').innerText = 'dark_mode';
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark');
        document.querySelector('.themeMode span').innerText = 'wb_sunny';
        localStorage.setItem('theme', 'light');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme) {
        changeTheme(savedTheme);
    } else {
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if(prefersDarkScheme){
            changeTheme('dark');
        } else {
            changeTheme('light');
        }
    }
});