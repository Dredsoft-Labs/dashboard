// Owl Carousel for Clients
$(".clients-carousel").owlCarousel({
    autoplay: true,
    autoplayTimeout: 2500,
    autoplayHoverPause: true,
    dots: true,
    loop: true,
    margin: 20,
    responsive: { 
        0: { items: 2 }, 
        576: { items: 3 }, 
        768: { items: 4 }, 
        992: { items: 6 } 
    }
});


const counters = document.querySelectorAll('.counter');
const speed = 200; // Higher = slower, smoother

counters.forEach(counter => {
    const updateCount = () => {
        const target = +counter.getAttribute('data-target');
        const count = +counter.innerText;
        const inc = Math.ceil(target / speed); // round up to avoid decimals

        if (count < target) {
            counter.innerText = count + inc;
            setTimeout(updateCount, 20); // smoother animation
        } else {
            counter.innerText = target; // prevent overshoot
        }
    };

    // Start animation when element is visible
    const observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            updateCount();
            observer.disconnect();
        }
    }, { threshold: 0.5 });

    observer.observe(counter);
});
