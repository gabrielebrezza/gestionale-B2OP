document.addEventListener('DOMContentLoaded', () => {
    const toggleMenuBtn = document.getElementById('toggleMenuBtn');
    const navBar = document.getElementById('navBar');
    const navBarItems = document.querySelector('#navBar ul');
    let navBarWidth = window.innerWidth < 550 ? '100%' : '300px', navBarOverflow;
    toggleMenuBtn.addEventListener('click', () => {
        toggleMenuBtn.style.rotate = toggleMenuBtn.style.rotate == '90deg' ? '0deg' : '90deg';
        window.addEventListener('resize', () => {
            if(window.innerWidth < 550){
                navBarWidth = '100%';
                navBarOverflow = 'hidden';
            }else{
                navBarWidth = '300px';
                navBarOverflow = 'auto';
            }
            navBar.style.width = navBar.style.width != '0px' ? navBarWidth : '0px';
            document.body.style.overflow = navBar.style.width == '0px' ? 'auto' : navBarOverflow;
        });
        navBar.style.width = navBar.style.width == navBarWidth ? '0px' : navBarWidth;
        document.body.style.overflow  = document.body.style.overflow != navBarOverflow ? navBarOverflow : 'auto';
        window.innerWidth
        if(navBarItems.style.opacity == 1){
            toggleMenuBtn.classList.remove('active');
            document.body.style.overflow = 'auto';
            navBarItems.style.opacity = 0;
            setTimeout(() =>{     
                navBarItems.style.display = 'none';
            }, 0);
        }else{
            toggleMenuBtn.classList.add('active');
            navBarItems.style.display = 'block';
            setTimeout(() =>{     
                navBarItems.style.opacity = 1;
            }, 0); 
        }
    });
});