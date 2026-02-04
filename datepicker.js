// =========================
// CUSTOM MONTH PICKER (no library)
// =========================

window.addEventListener('load', function() {
    const date = new Date();
 
    date.setMonth(date.getMonth() - 1);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const formattedDate = `${year}-${month}`;
    
    const monthInput = document.querySelector('.SelectMonth');
    if (monthInput) {
        monthInput.value = formattedDate;
    }
});

(function initCustomMonthPicker() {
  const input = document.querySelector(".SelectMonth");
  const dropdown = document.getElementById("monthPickerDropdown");
  if (!input || !dropdown) return;

  // Backdrop to close on outside click
  const backdrop = document.createElement("div");
  backdrop.className = "MonthPickerBackdrop";
  document.body.appendChild(backdrop);

  const yearLabel = document.getElementById("mpYearLabel");
  const prevYearBtn = document.getElementById("mpPrevYear");
  const nextYearBtn = document.getElementById("mpNextYear");
  const monthGrid = document.getElementById("mpMonthGrid");
  const btnThisMonth = document.getElementById("mpThisMonth");
  const btnClose = document.getElementById("mpClose");

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  function parseValue(val) {
    const m = (val || "").match(/^(\d{4})-(\d{2})$/);
    if (!m) {
      const d = new Date();
      return { y: d.getFullYear(), m: d.getMonth() + 1 };
    }
    return { y: Number(m[1]), m: Number(m[2]) };
  }

  function setValue(y, m) {
    const mm = String(m).padStart(2, "0");
    input.value = `${y}-${mm}`;

    // Trigger your existing behavior
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  let state = parseValue(input.value);

  function render() {
    yearLabel.textContent = String(state.y);
    monthGrid.innerHTML = "";

    for (let i = 1; i <= 12; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mpMonth" + (i === state.m ? " selected" : "");
      btn.textContent = MONTHS[i - 1];

      btn.addEventListener("click", () => {
        state.m = i;
        setValue(state.y, state.m);
        close();
      });

      monthGrid.appendChild(btn);
    }
  }

  function open() {
    // sync state from current input value before showing
    state = parseValue(input.value);
    render();
    dropdown.classList.add("open");
    backdrop.classList.add("open");
    dropdown.setAttribute("aria-hidden", "false");
  }

  function close() {
    dropdown.classList.remove("open");
    backdrop.classList.remove("open");
    dropdown.setAttribute("aria-hidden", "true");
  }

  input.addEventListener("click", (e) => {
    e.preventDefault();
    dropdown.classList.contains("open") ? close() : open();
  });

  backdrop.addEventListener("click", close);

  btnClose.addEventListener("click", close);

  prevYearBtn.addEventListener("click", () => {
    state.y -= 1;
    render();
  });

  nextYearBtn.addEventListener("click", () => {
    state.y += 1;
    render();
  });

  btnThisMonth.addEventListener("click", () => {
    const d = new Date();
    state.y = d.getFullYear();
    state.m = d.getMonth() + 1;
    setValue(state.y, state.m);
    close();
  });

  // Close on ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dropdown.classList.contains("open")) close();
  });

  // Ensure initial render state is correct
  render();
})();
