const [b, f] = [document.getElementById("Info"), document.getElementById("footer")]
io().on("test", d => { b.innerHTML = d.message; f.innerHTML = d.footer; });