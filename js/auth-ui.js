(function () {
    'use strict';

    const form = document.querySelector('[data-auth-form]');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const mode = form.dataset.authForm;
        const role = form.querySelector('[name="tipo"]:checked')?.value || 'aluno';
        const feedback = form.querySelector('[data-form-feedback]');
        const password = form.querySelector('[name="senha"]');

        if (password && password.value.length < 8) {
            feedback.textContent = 'Use pelo menos 8 caracteres na senha.';
            feedback.hidden = false;
            password.focus();
            return;
        }

        localStorage.setItem('wavetype_demo_role', role);
        feedback.textContent = mode === 'cadastro'
            ? 'Cadastro validado na interface. Abrindo a demonstração…'
            : 'Login validado na interface. Abrindo a demonstração…';
        feedback.hidden = false;
        window.setTimeout(() => {
            window.location.href = `app/${role}/index.html`;
        }, 650);
    });

    document.querySelector('[data-google-login]')?.addEventListener('click', () => {
        const feedback = form.querySelector('[data-form-feedback]');
        feedback.textContent = 'O botão está pronto para receber loginComGoogle() na integração com Supabase.';
        feedback.hidden = false;
    });
})();
