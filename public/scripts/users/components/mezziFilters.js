document.addEventListener('DOMContentLoaded', () => {
    let prevElement, prevOverlayElement, prevFirstElement;

    function checkVisibility() {
        if (window.scrollY != 0) return;
        const rows = document.querySelectorAll('.mezzoRow:not(.hidden)');
        if (!rows) return;
        if (prevFirstElement) prevFirstElement.classList.remove('first-row-visible');

        let element = rows[1];
        if (!element) element = rows[0];

        const overlayElement = element.closest('.overlay');
        if (prevElement && prevOverlayElement) {
            prevElement.style.animation = 'appear-opacity linear';
            prevElement.style.animationTimeline = 'view()';
            prevElement.style.animationRange = 'entry 0 cover 25%';
            prevOverlayElement.style.animation = 'appear-overlay linear';
            prevOverlayElement.style.animationTimeline = 'view()';
            prevOverlayElement.style.animationRange = 'entry 0 cover 25%';
            prevOverlayElement.style.transform = '';
        }

        prevFirstElement = rows[0];
        prevElement = element;
        prevOverlayElement = overlayElement;
        const rect = element.getBoundingClientRect();
        const elementHeight = rect.height;

        const visibleHeight = Math.max(0, Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top));
        const visiblePercentage = (visibleHeight / elementHeight) * 100;
        if (visiblePercentage > 10 && window.scrollY === 0) {
            overlayElement.style.transform = 'translateX(0)';
            element.style.animation = 'none';
            element.style.animationTimeline = 'none';
            element.style.animationRange = 'none'
            overlayElement.style.animation = 'none';
            overlayElement.style.animationTimeline = 'none';
            overlayElement.style.animationRange = 'none'
        } else if (visiblePercentage < 10 && window.scrollY === 0) {
            element.style.animation = 'appear-opacity linear';
            element.style.animationTimeline = 'view()';
            element.style.animationRange = 'entry 0 cover 25%';
            overlayElement.style.animation = 'appear-overlay linear';
            overlayElement.style.animationTimeline = 'view()';
            overlayElement.style.animationRange = 'entry 0 cover 25%';
            overlayElement.style.transform = '';
        }
        rows[0].closest('.overlay').style = '';
        rows[0].style = '';
        rows[0].classList.add('first-row-visible');
    }

    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }
    const debouncedCheckVisibility = debounce(checkVisibility, 600);
    window.addEventListener('scroll', debounce(checkVisibility, 300));
    window.addEventListener('resize', debounce(checkVisibility, 100));
    checkVisibility()
    const filtersErrorMessage = document.getElementById('filtersErrorMessage');
    const toggleFilters = document.getElementById('toggleFilters');
    toggleFilters.addEventListener('click', () => {
        const filters = document.getElementById('filters');
        if (!filters.classList.contains('active')) {
            filters.classList.add('active');
        } else {
            filtersErrorMessage.innerText = '';
            filters.classList.remove('active');
        }
    });


    const typeFilterInput = document.getElementById('mezzoType');
    const fromDateFilterInput = document.getElementById('fromDate');
    const toDateFilterInput = document.getElementById('toDate');
    const budgetFilterInput = document.getElementById('budget');


    const filter = () => {
        const rows = document.querySelectorAll('.mezzoRow');
        const typeFilter = typeFilterInput.value;
        const fromDateFilter = new Date(fromDateFilterInput.value);
        const toDateFilter = new Date(toDateFilterInput.value);
        const budgetFilter = budgetFilterInput.value;
        let isFilteringDate = fromDateFilter != 'Invalid Date' && toDateFilter != 'Invalid Date';

        if (!isFilteringDate && budgetFilter) {
            filtersErrorMessage.innerText = 'Per calcolare il prezzo inserire data di inizio e di fine noleggio.';
        } else {
            if (isFilteringDate && (toDateFilter < fromDateFilter)) {
                filtersErrorMessage.innerText = 'La data di fine noleggio deve essere dopo quella di inizio.';
            } else {
                filtersErrorMessage.innerText = '';
            }

        }

        for (const row of rows) {
            const matchType = row.dataset.type == typeFilter || typeFilter == 'all';
            let unavailable = false;
            let isInBudget = true;

            if (isFilteringDate) {
                const bookings = JSON.parse(row.dataset.bookings);
                for (const book of bookings) {
                    const bookFromDate = new Date(book.fromDate);
                    const bookToDate = new Date(book.toDate);

                    if ((fromDateFilter >= bookFromDate && fromDateFilter <= bookToDate) ||
                        (toDateFilter >= bookFromDate && toDateFilter <= bookToDate) ||
                        (fromDateFilter <= bookFromDate && toDateFilter >= bookToDate)) {
                        unavailable = true;
                        break;
                    }
                }
            }
            if (budgetFilter && isFilteringDate && !unavailable) {
                const prices = JSON.parse(row.dataset.prices);
                let startDay = new Date(fromDateFilter).getDay() - 1;
                startDay = startDay < 0 ? 6 : startDay;

                let totalDays = Math.floor((new Date(toDateFilter) - new Date(fromDateFilter)) / (1000 * 60 * 60 * 24)) + 1;

                const finalPrice = Array.from({
                    length: totalDays
                }, () => prices[startDay++ % 7]).reduce((a, b) => a + b, 0);
                isInBudget = finalPrice <= budgetFilter;
                const [kmIncluded, kmPrice] = row.dataset.kmprices.split(' ');
                row.querySelector('.budgetElement').innerHTML = `Prezzo a partire da soli ${finalPrice.toFixed(2)}€ + IVA, con ${kmIncluded} km inclusi.<br> Kilometri extra a ${kmPrice}€/km + IVA.`
            }
            if (matchType && (!isFilteringDate || (isFilteringDate && !unavailable)) && isInBudget) {
                row.classList.remove('hidden');
            } else {
                row.classList.add('hidden');
            }
        }
        const hiddenRows = document.querySelectorAll('.mezzoRow.hidden');
        if (hiddenRows.length == rows.length) {
            document.querySelector('.noElementShown').classList.add('active');
        } else {
            document.querySelector('.noElementShown').classList.remove('active');
        }

        function debounce(func, delay) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), delay);
            };
        }
        window.scrollTo.pageYOffset = 0;
        debouncedCheckVisibility();
    }



    const debouncedFilter = debounce(filter, 1000);

    typeFilterInput.addEventListener('change', filter);
    fromDateFilterInput.addEventListener('input', filter);
    toDateFilterInput.addEventListener('input', filter);
    budgetFilterInput.addEventListener('input', debouncedFilter);
});