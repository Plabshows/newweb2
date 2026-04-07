// booking-handler.js

document.addEventListener('DOMContentLoaded', () => {
    // Make sure we have the client initialized
    const supabaseUrl = 'https://nwxepstpedmxslbznejv.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53eGVwc3RwZWRteHNsYnpuZWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MDQ4NTQsImV4cCI6MjA4Njk4MDg1NH0.l4zN1IAwDXsMbkRW3qzN0fc-jB69KPbKV8rQpn13reM';
    
    // We can assume window.supabase exists because the CDN is included in the head of all pages
    const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;
    
    const form = document.getElementById('booking-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Find inputs
        const nameInput = form.querySelector('input[type="text"]');
        const emailInput = form.querySelector('input[type="email"]');
        const dateInput = form.querySelector('input[type="date"]');
        const typeSelect = form.querySelector('select');
        const budgetInput = form.querySelector('input[type="number"]');
        const interestsInput = form.querySelector('textarea');
        const submitBtn = form.querySelector('button');
        
        if (!nameInput || !emailInput || !submitBtn) return;
        
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'SENDING...';
        submitBtn.disabled = true;
        
        try {
            if (!supabase) {
                alert("There was an error connecting to our system. Please contact the lab directly.");
                throw new Error("Supabase client not initialized.");
            }

            const { error } = await supabase
                .from('inquiries')
                .insert([
                    {
                        name: nameInput.value,
                        email: emailInput.value,
                        event_date: dateInput ? dateInput.value : null,
                        event_type: typeSelect ? typeSelect.value : null,
                        budget: budgetInput ? budgetInput.value : null,
                        interests: interestsInput ? interestsInput.value : null
                    }
                ]);

            if (error) {
                throw error;
            }

            // Success state
            submitBtn.textContent = 'REQUEST RECEIVED!';
            submitBtn.style.backgroundColor = '#10b981'; // tailwind emerald-500
            submitBtn.style.color = '#ffffff';
            
            form.reset();
            
            setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                submitBtn.style.backgroundColor = '';
                submitBtn.style.color = '';
            }, 3000);

        } catch (err) {
            console.error("Submission error:", err);
            submitBtn.textContent = 'ERROR - TRY AGAIN';
            submitBtn.style.backgroundColor = '#ef4444'; // tailwind red-500
            submitBtn.style.color = '#ffffff';
            
            setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                submitBtn.style.backgroundColor = '';
                submitBtn.style.color = '';
            }, 3000);
        }
    });
});
