document.addEventListener('DOMContentLoaded', () => {
    const toggleMenuBtn = document.getElementById('toggleMenuBtn');
    const navBar = document.getElementById('navBar');
    const navBarItems = document.querySelector('#navBar ul');
    let navBarWidth = '300px';
    toggleMenuBtn.addEventListener('click', () => {
        toggleMenuBtn.style.rotate = toggleMenuBtn.style.rotate == '90deg' ? '0deg' : '90deg';

        navBar.style.width = navBar.style.width == navBarWidth ? '0px' : navBarWidth;

        if(navBarItems.style.opacity == 1){
            navBarItems.style.opacity = 0;
            setTimeout(() =>{     
                navBarItems.style.display = 'none';
            }, 0); 
        }else{
            
            navBarItems.style.display = 'block';
            setTimeout(() =>{     
                navBarItems.style.opacity = 1;
            }, 0); 
        }
    });
});