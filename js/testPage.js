const channel = new BroadcastChannel("greenPass-reader");
channel.addEventListener("message", e => {
    console.log(e.data);
});

