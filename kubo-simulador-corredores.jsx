import { useState, useMemo } from "react";
import { Lock, TrendingUp, ArrowRight, RefreshCw } from "lucide-react";

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
`;

const CORRIDORS = {
  AO: {
    code: "AO",
    country: "Angola",
    currency: "AOA",
    currencyName: "Kwanza",
    rail: "Multicaixa Express",
    pegType: "variável",
    spreadPct: 0.025,
    flatFee: 0,
  },
  CV: {
    code: "CV",
    country: "Cabo Verde",
    currency: "CVE",
    currencyName: "Escudo",
    rail: "BCA / Banco Atlântico",
    pegType: "fixo",
    fixedRate: 110.265,
    spreadPct: 0,
    flatFee: 1,
  },
  GW: {
    code: "GW",
    country: "Guiné-Bissau",
    currency: "XOF",
    currencyName: "Franco CFA",
    rail: "Wave / Orange (UEMOA)",
    pegType: "fixo",
    fixedRate: 655.957,
    spreadPct: 0,
    flatFee: 1,
  },
};

function fmt(n, decimals = 2) {
  return n.toLocaleString("pt-PT", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function KuboSimulator() {
  const [amount, setAmount] = useState(500);
  const [selected, setSelected] = useState("AO");
  const [midRate, setMidRate] = useState(1050);

  const corridor = CORRIDORS[selected];

  const result = useMemo(() => {
    const amt = Number(amount) || 0;
    if (corridor.pegType === "variável") {
      const effectiveRate = midRate * (1 - corridor.spreadPct);
      const received = amt * effectiveRate;
      const marketReceived = amt * midRate;
      const cost = marketReceived - received;
      return { effectiveRate, received, marketReceived, cost, feeLabel: `${(corridor.spreadPct * 100).toFixed(1)}% spread` };
    } else {
      const netSent = Math.max(amt - corridor.flatFee, 0);
      const received = netSent * corridor.fixedRate;
      const marketReceived = amt * corridor.fixedRate;
      const cost = marketReceived - received;
      return { effectiveRate: corridor.fixedRate, received, marketReceived, cost, feeLabel: `€${corridor.flatFee} fixo` };
    }
  }, [amount, midRate, corridor]);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen w-full" style={{ background: "#0D1B2A", fontFamily: "'Manrope', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <div className="max-w-3xl mx-auto px-5 py-10">
        {/* Header */}
        <div className="flex items-baseline justify-between border-b pb-4 mb-8" style={{ borderColor: "#22344A" }}>
          <div>
            <div
              className="text-2xl tracking-tight font-extrabold"
              style={{ color: "#F5F2EA", fontFamily: "'IBM Plex Mono', monospace" }}
            >
              KUBO
            </div>
            <div className="text-xs mt-1" style={{ color: "#8C9BAE" }}>
              Simulador de corredores — CH → PALOP
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: "#8C9BAE", fontFamily: "'IBM Plex Mono', monospace" }}>
              {timeStr} · painel de partidas
            </div>
          </div>
        </div>

        {/* Amount input */}
        <div className="mb-6">
          <label className="text-xs uppercase tracking-wide" style={{ color: "#8C9BAE" }}>
            Valor a enviar
          </label>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-3xl font-semibold" style={{ color: "#F5F2EA", fontFamily: "'IBM Plex Mono', monospace" }}>
              €
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              className="text-3xl font-semibold bg-transparent border-none outline-none w-40"
              style={{ color: "#F5F2EA", fontFamily: "'IBM Plex Mono', monospace" }}
            />
          </div>
        </div>

        {/* Corridor board */}
        <div className="space-y-2 mb-8">
          {Object.values(CORRIDORS).map((c) => {
            const isSelected = c.code === selected;
            return (
              <button
                key={c.code}
                onClick={() => setSelected(c.code)}
                className="w-full text-left rounded-lg px-4 py-3 flex items-center justify-between transition-colors"
                style={{
                  background: isSelected ? "#17293F" : "#0F1E30",
                  border: `1px solid ${isSelected ? "#E8A33D" : "#22344A"}`,
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="text-lg font-bold px-2 py-1 rounded"
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      color: isSelected ? "#0D1B2A" : "#F5F2EA",
                      background: isSelected ? "#E8A33D" : "transparent",
                    }}
                  >
                    CH→{c.code}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "#F5F2EA" }}>
                      {c.country}
                    </div>
                    <div className="text-xs" style={{ color: "#8C9BAE" }}>
                      {c.rail}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: "#8C9BAE" }}>
                  {c.pegType === "fixo" ? (
                    <>
                      <Lock size={13} />
                      <span>câmbio fixo</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp size={13} />
                      <span>câmbio variável</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Rate input for variable corridor */}
        {corridor.pegType === "variável" && (
          <div className="mb-6 flex items-center gap-3 text-sm" style={{ color: "#8C9BAE" }}>
            <RefreshCw size={14} />
            <span>Taxa interbancária EUR/AOA de referência:</span>
            <input
              type="number"
              value={midRate}
              onChange={(e) => setMidRate(e.target.value)}
              className="bg-transparent border-b w-24 outline-none"
              style={{ borderColor: "#22344A", color: "#F5F2EA", fontFamily: "'IBM Plex Mono', monospace" }}
            />
            <span>atualiza manualmente — valor ilustrativo</span>
          </div>
        )}

        {/* Result panel */}
        <div className="rounded-xl p-6" style={{ background: "#13233A", border: "1px solid #22344A" }}>
          <div className="flex items-center justify-between mb-5">
            <div className="text-xs uppercase tracking-wide" style={{ color: "#8C9BAE" }}>
              O destinatário recebe
            </div>
            <div className="text-xs px-2 py-1 rounded" style={{ background: "#1B3226", color: "#2FBF8F" }}>
              {corridor.feeLabel}
            </div>
          </div>

          <div
            className="text-4xl font-bold mb-6 flex items-baseline gap-2"
            style={{ color: "#F5F2EA", fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {fmt(result.received, corridor.currency === "AOA" ? 0 : 2)}
            <span className="text-lg font-medium" style={{ color: "#8C9BAE" }}>
              {corridor.currency}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div style={{ color: "#8C9BAE" }}>Taxa aplicada</div>
              <div style={{ color: "#F5F2EA", fontFamily: "'IBM Plex Mono', monospace" }}>
                1 € = {fmt(result.effectiveRate, corridor.currency === "AOA" ? 2 : 3)} {corridor.currency}
              </div>
            </div>
            <div>
              <div style={{ color: "#8C9BAE" }}>Ao câmbio de mercado receberia</div>
              <div style={{ color: "#F5F2EA", fontFamily: "'IBM Plex Mono', monospace" }}>
                {fmt(result.marketReceived, corridor.currency === "AOA" ? 0 : 2)} {corridor.currency}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-5 flex items-center justify-between" style={{ borderTop: "1px solid #22344A" }}>
            <div className="text-sm" style={{ color: "#8C9BAE" }}>
              Custo total da operação
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight size={14} style={{ color: "#E8A33D" }} />
              <span className="text-lg font-semibold" style={{ color: "#E8A33D", fontFamily: "'IBM Plex Mono', monospace" }}>
                ≈ {fmt(result.cost / (corridor.currency === "AOA" ? result.effectiveRate : corridor.fixedRate))} €
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-center" style={{ color: "#5A6B80" }}>
          Simulador ilustrativo — não constitui oferta de câmbio. CVE e XOF têm paridade fixa ao euro; AOA flutua no mercado interbancário.
        </div>
      </div>
    </div>
  );
}
