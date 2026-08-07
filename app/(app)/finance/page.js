"use client";

import { useEffect, useState } from "react";
import { Wallet, Plus } from "lucide-react";
import { createClient } from "../../../lib/supabaseClient";
import { LineChart, BarChart } from "../../../components/Charts";

export default function FinancePage() {
  const supabase = createClient();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [monthTotals, setMonthTotals] = useState({ income: 0, expenses: 0 });
  const [userId, setUserId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ account_id: "", amount: "", category: "", description: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: accData } = await supabase.from("accounts").select("*").eq("user_id", user.id);
    setAccounts(accData || []);
    if (accData?.length) setForm((f) => ({ ...f, account_id: accData[0].id }));

    // Movimientos recientes y la serie de 30 días son independientes entre
    // sí (ambos solo dependen de accData), así que se piden en paralelo.
    const [{ data: txData }, { data: chartTx }] = await Promise.all([
      supabase
        .from("transactions")
        .select("*, accounts!inner(user_id, name, currency)")
        .eq("accounts.user_id", user.id)
        .order("tx_date", { ascending: false })
        .limit(20),
      supabase
        .from("transactions")
        .select("amount, tx_date, accounts!inner(user_id)")
        .eq("accounts.user_id", user.id)
        .gte("tx_date", new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0])
        .order("tx_date"),
    ]);
    setTransactions(txData || []);

    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split("T")[0];
    });
    let running = 0;
    const series = days.map((day) => {
      const dayTotal = (chartTx || []).filter((t) => t.tx_date === day).reduce((s, t) => s + t.amount, 0);
      running += dayTotal;
      return { label: day.slice(5), value: running };
    });
    setChartData(series);

    const income = (chartTx || []).filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const expenses = (chartTx || []).filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    setMonthTotals({ income, expenses });

    // Gastos por categoría (para el gráfico de barras)
    const byCategory = {};
    (chartTx || [])
      .filter((t) => t.amount < 0)
      .forEach((t) => {
        const cat = t.category || "Otros";
        byCategory[cat] = (byCategory[cat] || 0) + Math.abs(t.amount);
      });
    setCategoryData(
      Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, value]) => ({ label, value }))
    );
  }

  async function addAccount() {
    if (!userId) return;
    const name = prompt("Nombre de la cuenta (ej. Cuenta principal)");
    if (!name) return;
    const { data, error: err } = await supabase
      .from("accounts")
      .insert({ user_id: userId, name, currency: "MXN", balance: 0 })
      .select()
      .single();
    if (err || !data) return setError(err?.message || "No se pudo crear la cuenta.");
    setAccounts((a) => [...a, data]);
  }

  async function addTransaction(e) {
    e.preventDefault();
    if (!form.amount || !form.account_id) return;
    const signedAmount = form.category === "Ingreso" ? Math.abs(Number(form.amount)) : -Math.abs(Number(form.amount));
    const { data, error: err } = await supabase
      .from("transactions")
      .insert({
        account_id: form.account_id,
        amount: signedAmount,
        category: form.category || "Sin categoría",
        description: form.description,
      })
      .select("*, accounts(name, currency)")
      .single();
    if (err || !data) return setError(err?.message || "No se pudo registrar el movimiento.");
    setTransactions((t) => [data, ...t]);
    setForm({ ...form, amount: "", category: "", description: "" });
    setShowForm(false);
  }

  return (
    <div className="p-6 sm:p-10 max-w-4xl mx-auto w-full">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-smoke flex items-center gap-2">
          <Wallet size={18} className="text-accent" /> Finanzas
        </h1>
        <div className="flex gap-2">
          <button onClick={addAccount} className="text-sm text-dimgray border border-onyx rounded-lg px-3 py-1.5">
            + Cuenta
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm btn-primary px-3 py-1.5"
          >
            <Plus size={15} /> Movimiento
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 bg-danger/10 border border-danger/30 text-danger text-sm rounded-xl px-4 py-2.5 flex items-center justify-between">
          {error}
          <button onClick={() => setError("")} className="text-danger/70 hover:text-danger">✕</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={addTransaction} className="mb-6 bg-surface border border-onyx rounded-xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <select
            value={form.account_id}
            onChange={(e) => setForm({ ...form, account_id: e.target.value })}
            className="bg-surface2 border border-onyx rounded-lg px-2 py-2 text-sm col-span-2 sm:col-span-1"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id} className="bg-base">
                {a.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Monto"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="bg-surface2 border border-onyx rounded-lg px-2 py-2 text-sm"
          />
          <input
            placeholder="Categoría"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="bg-surface2 border border-onyx rounded-lg px-2 py-2 text-sm"
          />
          <input
            placeholder="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="bg-surface2 border border-onyx rounded-lg px-2 py-2 text-sm"
          />
          <button type="submit" className="btn-primary text-sm">
            Guardar
          </button>
        </form>
      )}

      <div className="bg-surface border border-onyx rounded-3xl p-6 mb-4">
        <p className="text-dimgray text-xs">Balance · últimos 30 días</p>
        <p className="text-3xl font-semibold text-smoke mb-1">${(monthTotals.income - monthTotals.expenses).toLocaleString("es-MX")}</p>
        <p className="text-xs text-dimgray mb-3">
          <span className="text-success">+${monthTotals.income.toLocaleString("es-MX")}</span> ·{" "}
          <span className="text-danger">-${monthTotals.expenses.toLocaleString("es-MX")}</span>
        </p>
        <LineChart data={chartData} height={110} />
        <div className="flex justify-between text-[10px] text-onyx mt-1">
          <span>{chartData[0]?.label}</span>
          <span>{chartData[chartData.length - 1]?.label}</span>
        </div>
      </div>

      {categoryData.length > 0 && (
        <div className="bg-surface border border-onyx rounded-3xl p-6 mb-4">
          <p className="text-sm font-medium text-silver mb-4">Gastos por categoría · últimos 30 días</p>
          <BarChart data={categoryData} height={90} />
          <div className="flex justify-between mt-2 gap-1">
            {categoryData.map((c, i) => (
              <span key={i} className="flex-1 text-center text-[9px] text-onyx truncate" title={c.label}>
                {c.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <section className="bg-surface border border-onyx rounded-3xl p-6">
        <h2 className="text-sm font-medium text-silver mb-3">Movimientos recientes</h2>
        {transactions.length === 0 && <p className="text-sm text-onyx">Sin movimientos. Crea una cuenta y registra el primero.</p>}
        <ul className="flex flex-col divide-y divide-onyx">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
              <span>
                {t.description || t.category}
                <span className="text-dimgray text-xs ml-2">{t.category}</span>
              </span>
              <span className={t.amount < 0 ? "text-danger" : "text-success"}>
                {t.amount < 0 ? "-" : "+"}${Math.abs(t.amount).toLocaleString("es-MX")}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
