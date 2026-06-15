```html


<!DOCTYPE html>

<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>MASTERS Ecosystem</title>

    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <style>

        * {

            margin: 0;

            padding: 0;

            box-sizing: border-box;

            font-family: 'Poppins', sans-serif;

        }

        body {

            background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%);

            min-height: 100vh;

            display: flex;

            justify-content: center;

            align-items: center;

            padding: 20px;

            overflow-x: hidden;

        }

        .dashboard-container {

            width: 100%;

            max-width: 1100px;

            background: rgba(255, 255, 255, 0.4);

            backdrop-filter: blur(15px);

            -webkit-backdrop-filter: blur(15px);

            border: 1px solid rgba(255, 255, 255, 0.6);

            border-radius: 24px;

            padding: 40px;

            box-shadow: 0 20px 40px rgba(255, 75, 145, 0.15);

            position: relative;

        }

        h1 {

            color: #d11a5b;

            text-align: center;

            font-size: 2.5rem;

            font-weight: 700;

            margin-bottom: 30px;

            text-transform: uppercase;

            letter-spacing: 2px;

            text-shadow: 0 2px 4px rgba(0,0,0,0.05);

        }

        /* Grid System for Masters Cards */

        .masters-grid {

            display: grid;

            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));

            gap: 20px;

            margin-bottom: 20px;

        }

        .master-card {

            background: rgba(255, 255, 255, 0.7);

            border-radius: 16px;

            padding: 20px;

            border: 1px solid rgba(255, 255, 255, 0.8);

            transition: all 0.3s ease;

            box-shadow: 0 8px 16px rgba(0,0,0,0.02);

        }

        .master-card:hover {

            transform: translateY(-5px);

            box-shadow: 0 12px 24px rgba(255, 75, 145, 0.2);

            background: rgba(255, 255, 255, 0.9);

        }

        .master-card h3 {

            color: #2b2b2b;

            font-size: 1.1rem;

            margin-bottom: 8px;

            font-weight: 600;

            white-space: nowrap;

            overflow: hidden;

            text-overflow: ellipsis;

        }

        .balance-tag {

            color: #d11a5b;

            font-weight: 700;

            font-size: 1.2rem;

            margin-bottom: 6px;

        }

        /* Password container aur toggle button ki styling */

        .pass-container {

            display: flex;

            align-items: center;

            justify-content: space-between;

            background: rgba(255, 75, 145, 0.1);

            padding: 4px 8px;

            border-radius: 6px;

        }

        .pass-tag {

            font-size: 0.85rem;

            color: #666;

            font-family: monospace;

        }

        .toggle-password {

            background: none;

            border: none;

            color: #d11a5b;

            cursor: pointer;

            font-size: 0.85rem;

            padding-left: 5px;

        }

        /* Floating M Floating Action Button */

        .m-button {

            position: fixed;

            bottom: 40px;

            right: 40px;

            width: 70px;

            height: 70px;

            border-radius: 50%;

            background: linear-gradient(135deg, #ff4b91 0%, #ff76ce 100%);

            color: white;

            font-size: 1.8rem;

            font-weight: 700;

            display: flex;

            justify-content: center;

            align-items: center;

            cursor: pointer;

            border: none;

            box-shadow: 0 10px 25px rgba(255, 75, 145, 0.4);

            transition: all 0.3s ease;

            z-index: 100;

        }

        .m-button:hover {

            transform: scale(1.1) rotate(10deg);

            box-shadow: 0 15px 30px rgba(255, 75, 145, 0.6);

        }

        /* Modal / Popups Styling */

        .modal-overlay {

            position: fixed;

            top: 0;

            left: 0;

            width: 100%;

            height: 100%;

            background: rgba(0, 0, 0, 0.4);

            backdrop-filter: blur(8px);

            display: flex;

            justify-content: center;

            align-items: center;

            opacity: 0;

            pointer-events: none;

            transition: all 0.3s ease;

            z-index: 1000;

        }

        .modal-overlay.active {

            opacity: 1;

            pointer-events: auto;

        }

        .modal-box {

            background: white;

            padding: 35px;

            border-radius: 20px;

            width: 100%;

            max-width: 420px;

            box-shadow: 0 20px 40px rgba(0,0,0,0.1);

            transform: scale(0.9);

            transition: all 0.3s ease;

            position: relative;

        }

        .modal-overlay.active .modal-box {

            transform: scale(1);

        }

        .modal-box h2 {

            color: #2b2b2b;

            margin-bottom: 20px;

            font-size: 1.5rem;

        }

        .form-group {

            margin-bottom: 15px;

        }

        .form-group label {

            display: block;

            margin-bottom: 6px;

            font-size: 0.9rem;

            color: #555;

            font-weight: 600;

        }

        .form-group input {

            width: 100%;

            padding: 12px;

            border: 2px solid #f0f0f0;

            border-radius: 10px;

            outline: none;

            font-size: 1rem;

            transition: border-color 0.3s;

        }

        .form-group input:focus {

            border-color: #ff4b91;

        }

        .btn-panel {

            display: flex;

            gap: 10px;

            margin-top: 20px;

        }

        .btn {

            flex: 1;

            padding: 12px;

            border: none;

            border-radius: 10px;

            font-size: 1rem;

            font-weight: 600;

            cursor: pointer;

            transition: all 0.2s;

        }

        .btn-primary {

            background: #ff4b91;

            color: white;

        }

        .btn-primary:hover {

            background: #e03a7a;

        }

        .btn-secondary {

            background: #f0f0f0;

            color: #555;

        }

        .btn-secondary:hover {

            background: #e5e5e5;

        }

        .forgot-link {

            display: inline-block;

            margin-top: 12px;

            font-size: 0.85rem;

            color: #ff4b91;

            text-decoration: none;

            cursor: pointer;

        }

        .forgot-link:hover {

            text-decoration: underline;

        }

        /* Status & Errors */

        .error-msg {

            color: #d11a5b;

            font-size: 0.85rem;

            margin-top: 5px;

            display: none;

        }

        .user-info-panel {

            background: rgba(255, 75, 145, 0.05);

            padding: 15px;

            border-radius: 10px;

            margin-bottom: 15px;

            border-left: 4px solid #ff4b91;

        }

    </style>

</head>

<body>

    <div class="dashboard-container">

        <h1>Masters System Ecosystem</h1>

        <div class="masters-grid" id="mastersGrid"></div>

    </div>



    <button class="m-button" id="mBtn" onclick="openAuthModal()">M</button>



    <div class="modal-overlay" id="authModal">

        <div class="modal-box">

            <h2>Verify Identity</h2>

            <div class="form-group">

                <label>Master Name</label>

                <input type="text" id="authName" placeholder="e.g. MT, OLIVIA">

            </div>

            <div class="form-group">

                <label>Password</label>

                <input type="password" id="authPassword" placeholder="••••••••">

                <div class="error-msg" id="authError">Invalid Username or Password!</div>

            </div>

            <div class="btn-panel">

                <button class="btn btn-secondary" onclick="closeModal('authModal')">Cancel</button>

                <button class="btn btn-primary" onclick="handleAuthSubmit()">Verify</button>

            </div>

            <a class="forgot-link" onclick="triggerForgotPassword()">Not know password?</a>

        </div>

    </div>



    <div class="modal-overlay" id="transactionModal">

        <div class="modal-box">

            <h2>Transfer Operations</h2>

            <div class="user-info-panel">

                <p><strong>Account:</strong> <span id="sessionName">---</span></p>

                <p><strong>Available Balance:</strong> <span id="sessionBalance">0</span> PKR</p>

            </div>

            <div class="form-group">

                <label>Amount to Transfer</label>

                <input type="number" id="transferAmount" placeholder="Enter amount">

                <div class="error-msg" id="amountError">Insufficient balance or invalid amount!</div>

            </div>

            <div class="form-group">

                <label>Recipient Master Name</label>

                <input type="text" id="recipientName" placeholder="Receiver identity">

                <div class="error-msg" id="recipientError">Recipient not found in database!</div>

            </div>

            <div class="btn-panel">

                <button class="btn btn-secondary" onclick="closeModal('transactionModal')">Close</button>

                <button class="btn btn-primary" onclick="executeTransfer()">Transfer Now</button>

            </div>

        </div>

    </div>



    <script src="data.js"></script>

    <script>

        let currentLocalData = [];

        let activeSessionUser = null;



        window.addEventListener('DOMContentLoaded', async () => {

            currentLocalData = await fetchMastersData();

            renderDashboard();

        });



        // Dashboard dynamic screen rendering (Updated for Show/Hide Password)

        function renderDashboard() {

            const grid = document.getElementById('mastersGrid');

            grid.innerHTML = '';

                        

            currentLocalData.forEach((master, index) => {

                const card = document.createElement('div');

                card.className = 'master-card';

                card.innerHTML = `

                    <h3>${master.name}</h3>

                    <div class="balance-tag">Rs. ${master.balance.toLocaleString()}</div>

                    <div class="pass-container">

                       

                    </div>

                `;

                grid.appendChild(card);

            });

        }



        // Password Show/Hide karne ka function

        function togglePasswordDisplay(index, realPassword) {

            const passSpan = document.getElementById(`pass-${index}`);

            const icon = document.getElementById(`icon-${index}`);

            

            if (passSpan.innerText === "P: ••••••••") {

                passSpan.innerText = `P: ${realPassword}`;

                icon.classList.remove('fa-eye');

                icon.classList.add('fa-eye-slash');

            } else {

                passSpan.innerText = "P: ••••••••";

                icon.classList.remove('fa-eye-slash');

                icon.classList.add('fa-eye');

            }

        }



        function openAuthModal() {

            document.getElementById('authName').value = '';

            document.getElementById('authPassword').value = '';

            document.getElementById('authError').style.display = 'none';

            document.getElementById('authModal').classList.add('active');

        }



        function closeModal(id) {

            document.getElementById(id).classList.remove('active');

        }



        function triggerForgotPassword() {

            alert("Security Protocol Info: Click the eye icon on your respective Master card on the dashboard to reveal your password.");

        }



        function handleAuthSubmit() {

            const nameInput = document.getElementById('authName').value.trim().toUpperCase();

            const passInput = document.getElementById('authPassword').value;

            const errorDiv = document.getElementById('authError');



            const matchedUser = currentLocalData.find(u => u.name.toUpperCase() === nameInput && u.password === passInput);



            if (matchedUser) {

                activeSessionUser = matchedUser;

                errorDiv.style.display = 'none';

                closeModal('authModal');

                openTransactionPanel();

            } else {

                errorDiv.style.display = 'block';

            }

        }



        function openTransactionPanel() {

            document.getElementById('sessionName').innerText = activeSessionUser.name;

            document.getElementById('sessionBalance').innerText = activeSessionUser.balance.toLocaleString();

            document.getElementById('transferAmount').value = '';

            document.getElementById('recipientName').value = '';

                        

            document.getElementById('amountError').style.display = 'none';

            document.getElementById('recipientError').style.display = 'none';

                        

            document.getElementById('transactionModal').classList.add('active');

        }



        function executeTransfer() {

            const amountInput = parseFloat(document.getElementById('transferAmount').value);

            const targetInput = document.getElementById('recipientName').value.trim().toUpperCase();

                        

            const amountError = document.getElementById('amountError');

            const recipientError = document.getElementById('recipientError');



            amountError.style.display = 'none';

            recipientError.style.display = 'none';



            if (isNaN(amountInput) || amountInput <= 0 || amountInput > activeSessionUser.balance) {

                amountError.innerText = `Error: Insufficient balance! Your current limit is ${activeSessionUser.balance.toLocaleString()} PKR.`;

                amountError.style.display = 'block';

                return;

            }



            const targetAccount = currentLocalData.find(u => u.name.toUpperCase() === targetInput);

            if (!targetAccount) {

                recipientError.style.display = 'block';

                return;

            }



            if (targetAccount.id === activeSessionUser.id) {

                recipientError.innerText = "Cannot route transactions to your own balance root!";

                recipientError.style.display = 'block';

                return;

            }



            activeSessionUser.balance -= amountInput;

            targetAccount.balance += amountInput;



            renderDashboard();

                        

            alert(`Transaction Successful!\nSuccessfully routed Rs. ${amountInput.toLocaleString()} to ${targetAccount.name}.`);

            closeModal('transactionModal');

        }

    </script>

</body>

</html>



```
