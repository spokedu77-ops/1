'use client';

import React, { useState, useMemo } from 'react';

interface LedgerItem {
  id: string;
  date: string;
  type: '수입' | '지출';
  category: string;
  amount: number;
  note: string;
}

interface FixedItem {
  id: string;
  category: string;
  amount: number;
  note: string;
}

const CATEGORIES = {
  INCOME: ['센터 수업료', '과외 수업료', '기타'],
  EXPENSE: ['선생님 임금', '기타 사무', '개인 지출 (본가)', '개인 지출 (우리 가족)', '기타 일반'],
};

export default function FinancePage() {
  // 3,937만원으로 시작 (기초 자산)
  const [baseAssets] = useState<number>(39370000);
  
  const [items, setItems] = useState<LedgerItem[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedItem[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7));

  const [incForm, setIncForm] = useState({ category: CATEGORIES.INCOME[0], amount: '', note: '' });
  const [expForm, setExpForm] = useState({ category: CATEGORIES.EXPENSE[0], amount: '', note: '' });
  const [fixedForm, setFixedForm] = useState({ category: CATEGORIES.EXPENSE[0], amount: '', note: '' });

  // 실시간 계산 로직 (월별 필터와 무관하게 전체 누적액을 계산하여 보유금액 산출)
  const financeSummary = useMemo(() => {
    // 1. 현재 선택된 월의 데이터
    const monthlyItems = items.filter(item => item.date.startsWith(currentMonth));
    const income = monthlyItems.filter(i => i.type === '수입').reduce((sum, i) => sum + i.amount, 0);
    const expense = monthlyItems.filter(i => i.type === '지출').reduce((sum, i) => sum + i.amount, 0);

    // 2. 전체 기간의 누적 변동액 (이월 로직 핵심)
    const totalAccumulatedChange = items.reduce((acc, cur) => 
      cur.type === '수입' ? acc + cur.amount : acc - cur.amount, 0
    );
    
    // 보유 금액 = 기초 자산 + 전체 누적 변동액
    const totalBalance = baseAssets + totalAccumulatedChange;
    
    return { income, expense, profit: income - expense, totalBalance };
  }, [items, currentMonth, baseAssets]);

  const handleAdd = (type: '수입' | '지출', customData?: any) => {
    const amount = customData ? customData.amount : Number(type === '수입' ? incForm.amount : expForm.amount);
    if (!amount) return;

    const newItem: LedgerItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      date: new Date().toISOString().split('T')[0],
      type,
      category: customData ? customData.category : (type === '수입' ? incForm.category : expForm.category),
      amount,
      note: customData ? customData.note : (type === '수입' ? incForm.note : expForm.note),
    };

    setItems(prev => [newItem, ...prev]);
    if (!customData) {
      if (type === '수입') setIncForm({ ...incForm, amount: '', note: '' });
      else setExpForm({ ...expForm, amount: '', note: '' });
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans bg-white min-h-screen text-slate-900">
      
      {/* 자산 대시보드 - 보유 금액은 이월되어 표시됨 */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl flex-1 min-w-[140px]">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5 tracking-tighter">보유 금액</p>
          <p className="text-lg font-black whitespace-nowrap">{financeSummary.totalBalance.toLocaleString()}원</p>
        </div>
        <div className="bg-slate-50 border px-5 py-3 rounded-2xl flex-1 min-w-[140px]">
          <p className="text-[10px] font-bold text-blue-500 uppercase mb-0.5">이달 수입</p>
          <p className="text-lg font-black text-blue-600 whitespace-nowrap">{financeSummary.income.toLocaleString()}원</p>
        </div>
        <div className="bg-slate-50 border px-5 py-3 rounded-2xl flex-1 min-w-[140px]">
          <p className="text-[10px] font-bold text-red-400 uppercase mb-0.5">이달 지출</p>
          <p className="text-lg font-black text-red-600 whitespace-nowrap">{financeSummary.expense.toLocaleString()}원</p>
        </div>
        <div className="bg-slate-50 border px-5 py-3 rounded-2xl flex-1 min-w-[140px]">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">이달 수익</p>
          <p className={`text-lg font-black whitespace-nowrap ${financeSummary.profit >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
            {financeSummary.profit.toLocaleString()}원
          </p>
        </div>
      </div>

      {/* 입력 및 리스트 생략 (위의 코드와 동일) ... */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-blue-600 p-5 rounded-3xl text-white shadow-lg shadow-blue-100">
          <div className="flex flex-wrap gap-1 mb-3">
            {CATEGORIES.INCOME.map(cat => (
              <button key={cat} onClick={() => setIncForm({...incForm, category: cat})}
                className={`px-3 py-1 rounded-xl text-[10px] font-black cursor-pointer transition ${incForm.category === cat ? 'bg-white text-blue-600' : 'bg-blue-500 text-blue-100'}`}>{cat}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="number" placeholder="금액" className="flex-1 min-w-0 p-2.5 rounded-xl bg-blue-500 text-white placeholder:text-blue-300 outline-none text-sm font-bold" value={incForm.amount} onChange={e => setIncForm({...incForm, amount: e.target.value})} />
            <button onClick={() => handleAdd('수입')} className="bg-white text-blue-600 px-4 rounded-xl font-black text-xs cursor-pointer active:scale-95 transition">수입추가</button>
          </div>
        </div>

        <div className="bg-slate-900 p-5 rounded-3xl text-white shadow-lg shadow-slate-200">
          <div className="flex flex-wrap gap-1 mb-3">
            {CATEGORIES.EXPENSE.map(cat => (
              <button key={cat} onClick={() => setExpForm({...expForm, category: cat})}
                className={`px-3 py-1 rounded-xl text-[10px] font-black cursor-pointer transition ${expForm.category === cat ? 'bg-white text-slate-900' : 'bg-slate-700 text-slate-400'}`}>{cat}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="number" placeholder="금액" className="flex-1 min-w-0 p-2.5 rounded-xl bg-slate-800 text-white placeholder:text-slate-500 outline-none text-sm font-bold" value={expForm.amount} onChange={e => setExpForm({...expForm, amount: e.target.value})} />
            <button onClick={() => handleAdd('지출')} className="bg-white text-slate-900 px-4 rounded-xl font-black text-xs cursor-pointer active:scale-95 transition">지출추가</button>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-base uppercase tracking-tighter text-slate-400">Transaction History</h2>
          <input type="month" value={currentMonth} onChange={e => setCurrentMonth(e.target.value)} 
            className="text-xs font-bold bg-slate-100 p-2 rounded-lg outline-none cursor-pointer border-none shadow-inner" />
        </div>
        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-xs min-w-[600px]">
            <thead className="bg-slate-50 border-b text-slate-400 font-bold uppercase">
              <tr>
                <th className="p-3 text-left w-16">Day</th>
                <th className="p-3 text-left w-24">Category</th>
                <th className="p-3 text-left">Note</th>
                <th className="p-3 text-right w-32">Amount</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.filter(i => i.date.startsWith(currentMonth)).map(item => (
                <tr key={item.id} className="border-b last:border-none hover:bg-slate-50 group transition">
                  <td className="p-3 text-slate-400 font-medium">{item.date.slice(8)}일</td>
                  <td className="p-3 font-black">{item.category}</td>
                  <td className="p-3">
                    <input type="text" value={item.note} onChange={e => setItems(items.map(i => i.id === item.id ? {...i, note: e.target.value} : i))} className="w-full bg-transparent border-none outline-none text-slate-400 focus:text-slate-900 font-medium" placeholder="-" />
                  </td>
                  <td className={`p-3 text-right font-black whitespace-nowrap ${item.type === '수입' ? 'text-blue-600' : 'text-slate-900'}`}>
                    {item.type === '지출' && '-'}{item.amount.toLocaleString()}원
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => setItems(items.filter(i => i.id !== item.id))} className="text-slate-200 hover:text-red-500 cursor-pointer font-bold transition">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200">
        <h3 className="font-black text-[11px] mb-4 uppercase text-slate-400 tracking-[0.2em]">Fixed Item Management</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            {fixedExpenses.map(fixed => (
              <div key={fixed.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 group shadow-sm">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">{fixed.category}</span>
                  <span className="text-xs font-black">{fixed.note}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-red-500 whitespace-nowrap">{fixed.amount.toLocaleString()}원</span>
                  <button onClick={() => handleAdd('지출', fixed)} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer active:scale-95 transition whitespace-nowrap">지출 반영</button>
                  <button onClick={() => setFixedExpenses(fixedExpenses.filter(f => f.id !== fixed.id))} className="text-slate-200 hover:text-red-500 font-bold cursor-pointer transition">×</button>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2">
            <div className="flex gap-2">
              <select className="flex-1 p-2 text-xs border border-slate-100 rounded-lg bg-slate-50 outline-none cursor-pointer font-bold" value={fixedForm.category} onChange={e => setFixedForm({...fixedForm, category: e.target.value})}>
                {CATEGORIES.EXPENSE.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="text" placeholder="항목명" className="flex-1 p-2 text-xs border border-slate-100 rounded-lg outline-none font-bold" value={fixedForm.note} onChange={e => setFixedForm({...fixedForm, note: e.target.value})} />
            </div>
            <div className="flex gap-2">
              <input type="number" placeholder="금액" className="flex-1 p-2 text-xs border border-slate-100 rounded-lg outline-none font-bold" value={fixedForm.amount} onChange={e => setFixedForm({...fixedForm, amount: e.target.value})} />
              <button onClick={() => {
                if(!fixedForm.amount || !fixedForm.note) return;
                setFixedExpenses([...fixedExpenses, { id: `fixed-${Date.now()}`, ...fixedForm, amount: Number(fixedForm.amount) }]);
                setFixedForm({ ...fixedForm, amount: '', note: '' });
              }} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-black cursor-pointer hover:bg-slate-800 transition">저장</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}