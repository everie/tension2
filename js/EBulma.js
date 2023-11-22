/*
TENSION 2 - By Hans Elley
Bulma code
 */

document.addEventListener('DOMContentLoaded', () => {

    // Get all "navbar-burger" elements
    const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);
    const $menu = document.querySelector('.navbar-burger.game-menu');
    const $Resetter = document.querySelector('.navbar-item.ResetGame');

    // Add a click event on each of them
    $navbarBurgers.forEach( el => {
        el.addEventListener('click', () => {

            // Get the target from the "data-target" attribute
            const target = el.dataset.target;
            const $target = document.getElementById(target);

            // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
            el.classList.toggle('is-active');
            $target.classList.toggle('is-active');

        });
    });

    if ($Resetter !== undefined && $Resetter !== null) {
        $Resetter.addEventListener('click', function() {
            const target = $menu.dataset.target;
            const $target = document.getElementById(target);

            $target.classList.remove('is-active');
            $navbarBurgers.forEach(el => {
                el.classList.remove('is-active');
            });
        });
    }
});
