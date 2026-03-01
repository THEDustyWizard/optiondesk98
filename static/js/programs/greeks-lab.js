/* Greeks Lab.exe — Interactive Greeks visualizer */
(function() {
  window.GreeksLab = {
    init(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = `
        <div style="padding:4px;font-size:11px;">
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;align-items:center;border-bottom:1px solid #808080;padding-bottom:6px;">
            <label>Spot: <input class="gl-S" type="number" value="100" step="1" style="width:60px;font-size:11px;"></label>
            <label>Strike: <input class="gl-K" type="number" value="100" step="1" style="width:60px;font-size:11px;"></label>
            <label>Days: <input class="gl-days" type="number" value="30" step="1" style="width:50px;font-size:11px;"></label>
            <label>Rate%: <input class="gl-r" type="number" value="5" step="0.5" style="width:50px;font-size:11px;"></label>
            <label>Vol%: <input class="gl-vol" type="number" value="30" step="1" style="width:50px;font-size:11px;"></label>
            <label><select class="gl-type" style="font-size:11px;"><option value="call">Call</option><option value="put">Put</option></select></label>
            <button class="gl-calc" style="font-size:11px;padding:2px 10px;">Calculate</button>
          </div>
          
          <div style="display:flex;gap:8px;">
            <!-- Prices -->
            <div style="flex:1;">
              <div style="background:#000080;color:#fff;padding:2px 6px;font-weight:bold;">Model Prices</div>
              <div class="gl-prices" style="border:2px solid;border-color:#808080 #fff #fff #808080;padding:6px;background:#fff;"></div>
            </div>
            <!-- Greeks -->
            <div style="flex:1.5;">
              <div style="background:#000080;color:#fff;padding:2px 6px;font-weight:bold;">Greeks</div>
              <div class="gl-greeks" style="border:2px solid;border-color:#808080 #fff #fff #808080;padding:6px;background:#fff;"></div>
            </div>
          </div>
          
          <!-- Slider: What-if spot changes -->
          <div style="margin-top:8px;border:2px solid;border-color:#808080 #fff #fff #808080;padding:6px;background:#fff;">
            <div style="font-weight:bold;margin-bottom:4px;">📊 What-If: Spot Price Change</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="gl-slider-lo">$70</span>
              <input type="range" class="gl-slider" min="0" max="100" value="50" style="flex:1;">
              <span class="gl-slider-hi">$130</span>
              <span class="gl-slider-val" style="min-width:60px;font-weight:bold;"></span>
            </div>
            <div class="gl-slider-result" style="margin-top:4px;"></div>
          </div>
        </div>`;
      
      const inputs = {
        S: el.querySelector('.gl-S'),
        K: el.querySelector('.gl-K'),
        days: el.querySelector('.gl-days'),
        r: el.querySelector('.gl-r'),
        vol: el.querySelector('.gl-vol'),
        type: el.querySelector('.gl-type'),
      };
      const pricesDiv = el.querySelector('.gl-prices');
      const greeksDiv = el.querySelector('.gl-greeks');
      const slider = el.querySelector('.gl-slider');
      const sliderVal = el.querySelector('.gl-slider-val');
      const sliderResult = el.querySelector('.gl-slider-result');
      let lastData = null;
      
      async function calculate() {
        const S = parseFloat(inputs.S.value);
        const K = parseFloat(inputs.K.value);
        const T = parseFloat(inputs.days.value) / 365;
        const r = parseFloat(inputs.r.value) / 100;
        const sigma = parseFloat(inputs.vol.value) / 100;
        const type = inputs.type.value;
        
        try {
          const res = await fetch(`/api/price?S=${S}&K=${K}&T=${T}&r=${r}&sigma=${sigma}&type=${type}`);
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          lastData = data;
          
          pricesDiv.innerHTML = `
            <table style="width:100%;font-size:11px;border-collapse:collapse;">
              <tr><td style="padding:2px;">Black-Scholes:</td><td style="text-align:right;font-weight:bold;">$${data.prices.black_scholes.toFixed(4)}</td></tr>
              <tr><td style="padding:2px;">Binomial (100-step):</td><td style="text-align:right;font-weight:bold;">$${data.prices.binomial.toFixed(4)}</td></tr>
              <tr><td style="padding:2px;">Monte Carlo (10k):</td><td style="text-align:right;font-weight:bold;">$${data.prices.monte_carlo.toFixed(4)}</td></tr>
            </table>`;
          
          const g = data.greeks;
          greeksDiv.innerHTML = `
            <table style="width:100%;font-size:11px;border-collapse:collapse;">
              <tr style="border-bottom:1px solid #ddd;"><td colspan="4" style="padding:2px;font-weight:bold;color:#000080;">First Order</td></tr>
              <tr>
                <td style="padding:2px;">Δ Delta:</td><td style="text-align:right;width:80px;font-weight:bold;">${g.delta.toFixed(4)}</td>
                <td style="padding:2px;">Γ Gamma:</td><td style="text-align:right;width:80px;font-weight:bold;">${g.gamma.toFixed(4)}</td>
              </tr>
              <tr>
                <td style="padding:2px;">Θ Theta:</td><td style="text-align:right;font-weight:bold;">${g.theta.toFixed(4)}</td>
                <td style="padding:2px;">ν Vega:</td><td style="text-align:right;font-weight:bold;">${g.vega.toFixed(4)}</td>
              </tr>
              <tr>
                <td style="padding:2px;">ρ Rho:</td><td style="text-align:right;font-weight:bold;">${g.rho.toFixed(4)}</td>
                <td></td><td></td>
              </tr>
              <tr style="border-bottom:1px solid #ddd;"><td colspan="4" style="padding:4px 2px 2px;font-weight:bold;color:#000080;">Second Order</td></tr>
              <tr>
                <td style="padding:2px;">Vanna:</td><td style="text-align:right;font-weight:bold;">${g.vanna.toFixed(4)}</td>
                <td style="padding:2px;">Volga:</td><td style="text-align:right;font-weight:bold;">${g.volga.toFixed(4)}</td>
              </tr>
              <tr>
                <td style="padding:2px;">Charm:</td><td style="text-align:right;font-weight:bold;">${g.charm.toFixed(4)}</td>
                <td></td><td></td>
              </tr>
            </table>`;
          
          // Update slider range
          const lo = Math.round(K * 0.7);
          const hi = Math.round(K * 1.3);
          el.querySelector('.gl-slider-lo').textContent = '$' + lo;
          el.querySelector('.gl-slider-hi').textContent = '$' + hi;
          updateSlider();
          
        } catch(e) {
          pricesDiv.innerHTML = '<div style="color:red;">' + e.message + '</div>';
        }
      }
      
      async function updateSlider() {
        const K = parseFloat(inputs.K.value);
        const lo = K * 0.7;
        const hi = K * 1.3;
        const pct = parseInt(slider.value) / 100;
        const spotNew = lo + pct * (hi - lo);
        sliderVal.textContent = '$' + spotNew.toFixed(2);
        
        const T = parseFloat(inputs.days.value) / 365;
        const r = parseFloat(inputs.r.value) / 100;
        const sigma = parseFloat(inputs.vol.value) / 100;
        const type = inputs.type.value;
        
        try {
          const res = await fetch(`/api/price?S=${spotNew.toFixed(2)}&K=${K}&T=${T}&r=${r}&sigma=${sigma}&type=${type}`);
          const data = await res.json();
          const g = data.greeks;
          sliderResult.innerHTML = `
            Price: <strong>$${data.prices.black_scholes.toFixed(4)}</strong> |
            Δ <strong>${g.delta.toFixed(3)}</strong> |
            Γ <strong>${g.gamma.toFixed(4)}</strong> |
            Θ <strong>${g.theta.toFixed(4)}</strong> |
            ν <strong>${g.vega.toFixed(4)}</strong>`;
        } catch(e) { /* skip */ }
      }
      
      el.querySelector('.gl-calc').addEventListener('click', calculate);
      slider.addEventListener('input', updateSlider);
      calculate();
    }
  };
})();
WM.registerProgram('greeks-lab', (containerId) => window.GreeksLab && window.GreeksLab.init(containerId));
