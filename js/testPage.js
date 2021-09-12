const channel = new BroadcastChannel("greenPass-reader");

channel.addEventListener("message", e => {
    var printerArea = document.getElementById('printer');
    console.log(e.data);
    var p = document.createElement('p');
    p.textContent = JSON.stringify(e.data);
    printerArea.appendChild(p);
});

