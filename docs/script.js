// Initialize Lucide Icons
lucide.createIcons();

// Scroll Reveal Animation (Intersection Observer)
document.addEventListener('DOMContentLoaded', () => {
  const reveals = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Optional: Stop observing once revealed
        observer.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  });

  reveals.forEach(reveal => {
    revealObserver.observe(reveal);
  });
  
  // Trigger explicitly once for elements already in viewport
  setTimeout(() => {
    reveals.forEach(reveal => {
      const rect = reveal.getBoundingClientRect();
      if (rect.top <= window.innerHeight) {
        reveal.classList.add('active');
      }
    });
  }, 100);
});
