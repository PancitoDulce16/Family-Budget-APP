// Balance Module - Calculate who owes whom
import { db } from './firebase-config.js';
import { formatCurrency } from './utils.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let familyMembers = [];
let userFamilyGroup = null;
let familyGroupCurrency = 'USD';


export function initializeBalance(familyGroupId, members) {
  userFamilyGroup = familyGroupId;
  familyMembers = members;
}

export async function calculateBalance() {
  if (!userFamilyGroup) return;

  // Get currency from app.js or a global state
  const appContainer = document.getElementById('app-container');
  if (appContainer) {
      familyGroupCurrency = appContainer.dataset.currency || 'USD';
  }

  try {
    // Get all shared transactions
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('familyGroupId', '==', userFamilyGroup),
      where('isShared', '==', true)
    );

    const snapshot = await getDocs(transactionsQuery);
    const sharedTransactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Initialize balance object for each member
    const balances = {};
    familyMembers.forEach(member => {
      balances[member.id] = {
        name: member.displayName,
        paid: 0,
        owes: 0,
        balance: 0
      };
    });

    // Calculate balances
    sharedTransactions.forEach(transaction => {
      if (transaction.type !== 'expense') return;
      
      // Tasa de cambio fija.
      const USD_TO_CRC_RATE = 500;
      let amountInGroupCurrency = transaction.amount;
      const txCurrency = transaction.currency || familyGroupCurrency;

      if (txCurrency !== familyGroupCurrency) {
        if (familyGroupCurrency === 'USD' && txCurrency === 'CRC') {
          amountInGroupCurrency = transaction.amount / USD_TO_CRC_RATE;
        } else if (familyGroupCurrency === 'CRC' && txCurrency === 'USD') {
          amountInGroupCurrency = transaction.amount * USD_TO_CRC_RATE;
        }
      }

      const paidBy = transaction.paidBy;

      // Add to paid amount
      if (balances[paidBy]) {
        balances[paidBy].paid += amountInGroupCurrency;
      }

      // Distribute debt among shared members
      if (transaction.sharedWith && transaction.sharedWith.length > 0) {
        transaction.sharedWith.forEach(share => {
          const memberId = share.userId;
          const percentage = share.percentage || 0;
          const owedAmount = (amountInGroupCurrency * percentage) / 100;

          if (balances[memberId]) {
            balances[memberId].owes += owedAmount;
          }
        });
      } else {
        // If no specific shares, split equally among all members
        const perPerson = amountInGroupCurrency / familyMembers.length;
        familyMembers.forEach(member => {
          if (balances[member.id]) {
            balances[member.id].owes += perPerson;
          }
        });
      }
    });

    // Calculate net balance for each member
    Object.keys(balances).forEach(memberId => {
      balances[memberId].balance = balances[memberId].paid - balances[memberId].owes;
    });

    displayBalance(balances);
    displayDetailedBalance(balances);

  } catch (error) {
    console.error('Error calculando balance:', error);
  }
}

function displayBalance(balances) {
  const balanceDiv = document.getElementById('member-balance');
  if (!balanceDiv) return;

  const balanceArray = Object.entries(balances).map(([id, data]) => ({
    id,
    ...data
  }));

  // Sort by balance (most negative first)
  balanceArray.sort((a, b) => a.balance - b.balance);

  if (balanceArray.every(b => b.balance === 0)) {
    balanceDiv.innerHTML = '<p class="text-gray-500">No hay deudas pendientes. ¡Todo está equilibrado!</p>';
    return;
  }

  balanceDiv.innerHTML = '';

  // Find who owes and who is owed
  const debtors = balanceArray.filter(b => b.balance < 0);
  const creditors = balanceArray.filter(b => b.balance > 0);

  const suggestions = [];

  // Simple debt settlement algorithm
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const debtAmount = Math.abs(debtor.balance);
    const creditAmount = creditor.balance;

    const settleAmount = Math.min(debtAmount, creditAmount);

    suggestions.push({
      from: debtor.name,
      to: creditor.name,
      amount: settleAmount
    });

    debtor.balance += settleAmount;
    creditor.balance -= settleAmount;

    if (Math.abs(debtor.balance) < 0.01) i++;
    if (Math.abs(creditor.balance) < 0.01) j++;
  }

  suggestions.forEach(suggestion => {
    const div = document.createElement('div');
    div.className = 'p-3 bg-yellow-50 border border-yellow-200 rounded-lg';
    div.innerHTML = `
      <p class="text-sm">
        <span class="font-semibold">${suggestion.from}</span>
        le debe
        <span class="font-bold text-red-600">${formatCurrency(suggestion.amount, familyGroupCurrency)}</span>
        a
        <span class="font-semibold">${suggestion.to}</span>
      </p>
    `;
    balanceDiv.appendChild(div);
  });
}

function displayDetailedBalance(balances) {
  const detailedDiv = document.getElementById('member-balance-detailed');
  if (!detailedDiv) return;

  detailedDiv.innerHTML = '';

  const balanceArray = Object.entries(balances).map(([id, data]) => ({
    id,
    ...data
  }));

  balanceArray.forEach(member => {
    const card = document.createElement('div');
    card.className = 'bg-white border rounded-lg p-4 shadow-sm';

    const statusColor = member.balance > 0 ? 'text-green-600' : member.balance < 0 ? 'text-red-600' : 'text-gray-600';
    const statusText = member.balance > 0 ? 'Le deben' : member.balance < 0 ? 'Debe' : 'Equilibrado';

    card.innerHTML = `
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-lg font-semibold">${member.name}</h3>
        <span class="text-sm font-medium ${statusColor}">${statusText}</span>
      </div>
      <div class="grid grid-cols-3 gap-2 text-sm">
        <div class="text-center p-2 bg-green-50 rounded">
          <p class="text-xs text-gray-600">Pagó</p>
          <p class="font-bold text-green-600">${formatCurrency(member.paid, familyGroupCurrency)}</p>
        </div>
        <div class="text-center p-2 bg-red-50 rounded">
          <p class="text-xs text-gray-600">Debe</p>
          <p class="font-bold text-red-600">${formatCurrency(member.owes, familyGroupCurrency)}</p>
        </div>
        <div class="text-center p-2 bg-gray-50 rounded">
          <p class="text-xs text-gray-600">Balance</p>
          <p class="font-bold ${statusColor}">${formatCurrency(Math.abs(member.balance), familyGroupCurrency)}</p>
        </div>
      </div>
    `;

    detailedDiv.appendChild(card);
  });
}
