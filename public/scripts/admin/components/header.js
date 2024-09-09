document.addEventListener('DOMContentLoaded', () => {
    const toggleMenuBtn = document.getElementById('toggleMenuBtn');
    const navBar = document.getElementById('navBar');
    const navBarItems = document.querySelector('#navBar ul');
    let navBarWidth = window.innerWidth < 550 ? '100%' : '300px';
    toggleMenuBtn.addEventListener('click', () => {
        toggleMenuBtn.style.rotate = toggleMenuBtn.style.rotate == '90deg' ? '0deg' : '90deg';
        window.addEventListener('resize', () => {
            if(window.innerWidth < 550){
                navBarWidth = '100%';
            }else{
                navBarWidth = '300px';
            }
            navBar.style.width = navBar.style.width != '0px' ? navBarWidth : '0px';
        });
        navBar.style.width = navBar.style.width == navBarWidth ? '0px' : navBarWidth;
        navBar.style.borderLeft = navBar.style.borderLeft == '1px solid rgb(51, 51, 51)' ? 'none' : '1px solid #333';
        
        if(navBarItems.style.opacity == 1){
            navBarItems.style.opacity = 0;
            setTimeout(() =>{     
                navBarItems.style.display = 'none';
            }, 350); 
        }else{
            
            navBarItems.style.display = 'block';
            setTimeout(() =>{     
                navBarItems.style.opacity = 1;
            }, 350); 
        }
    });
});