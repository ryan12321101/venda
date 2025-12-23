// Payment Page Logic
let customerData = {};
let orderData = {};
let pixTimer;
let pixTimeRemaining = 600; // 10 minutes in seconds

// CPF Formatting
document.getElementById('customerCpf')?.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        e.target.value = value;
    }
});

// Customer Form Submission
document.getElementById('customerForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerEmail').value.trim(); // agora consideramos telefone no lugar de email
    const cpf = document.getElementById('customerCpf').value.replace(/\D/g, '');
    
    // Validate CPF
    if (cpf.length !== 11) {
        alert('Por favor, insira um CPF válido.');
        return;
    }
    
    // Validate Phone (simples)
    const phoneRegex = /^\d{10,11}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
        alert('Por favor, insira um número de WhatsApp válido.');
        return;
    }
    
    // Store customer data
    customerData = {
        name: name,
        phone: phone.replace(/\D/g, ''), // apenas números
        cpf: cpf,
        timestamp: new Date().toISOString()
    };
    
    // Go to payment step
    goToPixPayment();
});

function goToPixPayment() {
    document.getElementById('step2').classList.add('active');
    document.getElementById('customerInfoStep').classList.remove('active');
    document.getElementById('pixPaymentStep').classList.add('active');
    generatePixPayment();
    startPixTimer();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBackToCustomerInfo() {
    document.getElementById('step2').classList.remove('active');
    document.getElementById('pixPaymentStep').classList.remove('active');
    document.getElementById('customerInfoStep').classList.add('active');
    if (pixTimer) clearInterval(pixTimer);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function generatePixPayment() {
    const orderId = 'FG' + Date.now();
    const pixCode = generatePixCode(orderId);
    orderData = {
        id: orderId,
        ...customerData,
        product: 'Pack de Cortes Virais Family Guy',
        amount: 29.90,
        status: 'pending',
        pixCode: pixCode,
        createdAt: new Date().toISOString()
    };
    document.getElementById('pixCode').value = pixCode;
    generateQRCode(pixCode);
    saveOrder(orderData);
}

function generatePixCode(orderId) {
    const recipientCpf = '08437526299';
    const recipientName = 'Ryan Dos Reis Araujo';
    const amount = '29.90';
    const city = 'SAO PAULO';
    const pixCode = `00020126330014BR.GOV.BCB.PIX011108437526299520400005303986540529.905802BR5920RYAN DOS REIS ARAUJO6009SAO PAULO622605225MCU2pj8E9C4IeyqTysPLn63041CE8${recipientCpf}520400005303986540${amount}5802BR5913${recipientName.substring(0, 25)}6009${city}62070503***${orderId}6304`;
    return pixCode + generateCRC16(pixCode);
}

function generateCRC16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
            else crc <<= 1;
        }
    }
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function generateQRCode(pixCode) {
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=00020126330014BR%2EGOV%2EBCB%2EPIX011108437526299520400005303986540529%2E905802BR5920RYAN%20DOS%20REIS%20ARAUJO6009SAO%20PAULO622605225MCU2pj8E9C4IeyqTysPLn63041CE8
`;
    const qrContainer = document.getElementById('pixQrCode');
    qrContainer.innerHTML = `<img id="qrCodeImage" src="${qrCodeUrl}" alt="QR Code PIX">`;
}

function copyPixCode() {
    const pixCodeInput = document.getElementById('pixCode');
    pixCodeInput.select();
    pixCodeInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(pixCodeInput.value).then(() => {
        const btn = document.querySelector('.btn-copy span');
        const originalText = btn.textContent;
        btn.textContent = 'Copiado!';
        setTimeout(() => btn.textContent = originalText, 2000);
    }).catch(() => alert('Erro ao copiar. Por favor, copie manualmente.'));
}

function startPixTimer() {
    pixTimeRemaining = 600;
    updateTimerDisplay();
    pixTimer = setInterval(() => {
        pixTimeRemaining--;
        updateTimerDisplay();
        if (pixTimeRemaining <= 0) {
            clearInterval(pixTimer);
            handlePixExpired();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(pixTimeRemaining / 60);
    const seconds = pixTimeRemaining % 60;
    document.getElementById('pixTimer').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function handlePixExpired() {
    alert('O código PIX expirou. Por favor, gere um novo código.');
    goBackToCustomerInfo();
}

async function saveOrder(order) {
    try {
        const response = await fetch('tables/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });
        if (response.ok) console.log('Order saved:', await response.json());
    } catch (error) {
        console.error('Error saving order:', error);
    }
}

function confirmPaymentManual() {
    if (confirm('Confirma que já realizou o pagamento via PIX?')) processPaymentConfirmation();
}

async function processPaymentConfirmation() {
    orderData.status = 'paid';
    orderData.paidAt = new Date().toISOString();
    try {
        await fetch(`tables/orders/${orderData.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'paid', paidAt: orderData.paidAt })
        });
    } catch (error) {
        console.error('Error updating order:', error);
    }
    showConfirmation();
}

function showConfirmation() {
    if (pixTimer) clearInterval(pixTimer);
    document.getElementById('step3').classList.add('active');
    document.getElementById('pixPaymentStep').classList.remove('active');
    document.getElementById('confirmationStep').classList.add('active');
    
    document.getElementById('confirmEmail').textContent = customerData.phone;
    document.getElementById('orderId').textContent = orderData.id;
    document.getElementById('orderDate').textContent = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    
    // Envio via WhatsApp
    sendConfirmationWhatsApp();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Função para enviar WhatsApp com link e mensagem
function confirmarPagamentoWhatsApp() {
    const seuNumero = '5594984046320'; // <-- SEU número aqui

    const mensagem =
        `Olá, acabei de realizar o pagamento via PIX.\n\n` +
        `Nome: ${customerData.name}\n` +
        `Pedido: ${orderData.id}\n\n` +
        `Vou enviar o comprovante agora.`;

    const link = `https://wa.me/${seuNumero}?text=${encodeURIComponent(mensagem)}`;

    window.open(link, '_blank');
}


// Auto-check payment status (simulate webhook)
function startPaymentStatusCheck() {
    const checkInterval = setInterval(async () => {
        const shouldConfirm = Math.random() > 0.95;
        if (shouldConfirm && orderData.status === 'pending') {
            clearInterval(checkInterval);
            await processPaymentConfirmation();
        }
    }, 1000);
    setTimeout(() => clearInterval(checkInterval), pixTimeRemaining * 1000);
}
