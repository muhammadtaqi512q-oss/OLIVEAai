// data.js - Source of Masters Data
const mastersData = [
    { id: 1, name: "MT", balance: 500000, password: "MT512" },
    { id: 2, name: "OLIVIA", balance: 200000, password: "OLIVIA513" },
    { id: 3, name: "JACK", balance: 500000, password: "JACK514" },
    { id: 4, name: "THUNDER", balance: 700000, password: "THUNDER786" }, // Added default password
    { id: 5, name: "WILLIAM", balance: 500000, password: "WILLIAM123" },
    { id: 6, name: "ELIZBETH", balance: 800000, password: "ELIZBETH456" },
    { id: 7, name: "ZIRA", balance: 1000000, password: "ZIRA789" },
    { id: 8, name: "LYRA HEAD MANAGER OF NEXURA", balance: 3500000, password: "LYRA000" },
    { id: 9, name: "AHMED", balance: 50000, password: "AHMED111" },
    { id: 10, name: "OWNER", balance: 10000000, password: "OWNERMASTER" }
];

// Function to simulate fetching data from data source
function fetchMastersData() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([...mastersData]);
        }, 100); // Fast simulation
    });
}
