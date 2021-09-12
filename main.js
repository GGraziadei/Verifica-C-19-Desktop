const channel = new BroadcastChannel("greenPass-reader");
var html5QrCode = new Html5Qrcode("qr-reader");
var lastResult, countResults = 0, cameraId;

var selectorCamera = document.getElementById('selectorCamera');
var resultsTableBody = document.getElementById('results-table-body');
var sound = document.getElementById("qrCodeBeep");

$(document).ready(() => {
    getDevices();
    if ($.cookie('cameraId')) {
        cameraId = $.cookie('cameraId');
        startHtml5QrCode(cameraId);
    }
});

async function getGreenPass(qrCode) {
    var result;
    var data = { qrCodeStr: qrCode };
    var proxy   = "https://cors-anywhere.herokuapp.com/";
    var url     = "https://verifica-c19.inclouditalia.it/";

    await $.ajax({
        url: proxy + url,
        type: "POST",
        data: data,
        dataType: "json",
        crossDomain: true,
        async: true,
        headers: {
            "Authorization": "Basic WklEZ2o5YUoxTzphVnBZMlpHUWg2"
        },
        success: data => result = data,
        error: function (jqXHR, exception) {
            var msg = '';
            if (jqXHR.status === 0) {
                msg = 'Not connect.\n Verify Network.';
            } else if (jqXHR.status == 404) {
                msg = 'Requested page not found. [404]';
            } else if (jqXHR.status == 500) {
                msg = 'Internal Server Error [500].';
            } else if (exception === 'parsererror') {
                msg = 'Requested JSON parse failed.';
            } else if (exception === 'timeout') {
                msg = 'Time out error.';
            } else if (exception === 'abort') {
                msg = 'Ajax request aborted.';
            } else {
                msg = 'Uncaught Error.\n' + jqXHR.responseText;
            }
            console.log(msg);
        }
    });
    console.log(result);
    return result;
}

function testChannelConnection() {
    request = {
        name: "QR_CODE_SCANNER",
        action: "testConnection"
    };
    console.log(request)
    channel.postMessage(request);
    request = {
        name: "QR_CODE_SCANNER",
        action: "sendData",
        data: new Date().getTime()
    };
    console.log(request)
    channel.postMessage(request);
}

function setCamera() {
    html5QrCode.stop().then((ignore) => { }).catch((err) => console.log(err));
    var deviceId = $('#selectorCamera option:selected').val();
    cameraId = deviceId;
    $.cookie('cameraId', cameraId);
    sound.play();
    startHtml5QrCode(cameraId);
}

function getDevices() {
    Html5Qrcode.getCameras().then(devices => {
        /**
         * devices would be an array of objects of type:
         * { id: "id", label: "label" }
         */
        if (devices && devices.length) {
            devices.forEach(device => {
                var option = document.createElement('option');
                option.value = device.id;
                option.label = device.label;
                selectorCamera.appendChild(option);
            });
        }
    }).catch(err => { console.log(err) });
}

function startHtml5QrCode(cameraId) {
    html5QrCode.start(
        cameraId,
        {
            fps: 25,
        },
        (decodedText, decodedResult) => {
            if (decodedText != lastResult) {
                lastResult = decodedText;
                getGreenPass(decodedText).then(greenPass => {
                    if (!greenPass.data && checkGreenPass(greenPass)) {
                        sound.play();
                        request = {
                            name: "QR_CODE_SCANNER",
                            action: "sendData",
                            name: "greenPass",
                            data: greenPass
                        };
                        channel.postMessage(request);
                        addTableResultsRow(greenPass);
                    }
                });
            }
        },
        (errorMessage) => {
            console.log(errorMessage);
        })
        .catch((err) => {
            console.log(err);
        });
}

function addTableResultsRow(greenPass) {
    var row = document.createElement('tr');
    resultsTableBody.appendChild(row);

    var dataOra = document.createElement('td');
    dataOra.textContent = new Date().toISOString();
    row.appendChild(dataOra);

    var nome = document.createElement('td');
    nome.textContent = greenPass.holder.forename;
    row.appendChild(nome);

    var cognome = document.createElement('td');
    cognome.textContent = greenPass.holder.surname;
    row.appendChild(cognome);

    var dataNascita = document.createElement('td');
    dataNascita.textContent = new Date(greenPass.holder.dateOfBirth).toLocaleDateString();
    row.appendChild(dataNascita);
}

function alertTimeout(mymsg, mymsecs) {
    var myelement = document.createElement("div");
    myelement.setAttribute("style", "background-color: grey;color:black; width: 450px;height: 200px;position: absolute;top:0;bottom:0;left:0;right:0;margin:auto;border: 4px solid black;font-family:arial;font-size:25px;font-weight:bold;display: flex; align-items: center; justify-content: center; text-align: center;");
    myelement.innerHTML = mymsg;
    setTimeout(function () {
        myelement.parentNode.removeChild(myelement);
    }, mymsecs);
    document.body.appendChild(myelement);
}

function checkGreenPass(greenPass) {
    var dataRilascio = new Date(greenPass.certificate.date);
    var dataFineValidita = new Date(dataRilascio.getTime());
    //se type è un numero => certificazione rilasciata a seguito vaccino (270 gironi)
    //se type stringa     => certificazione rilasciata a seguito tampone (2 giorni)
    if ( greenPass.certificate.totalDoses ) {
        dataFineValidita.setDate(dataRilascio.getDate() + 270);
    } else {
        dataFineValidita.setDate(dataRilascio.getDate() + 2);
    }
    console.log(dataFineValidita.toDateString());
    if ((dataFineValidita.getTime() - new Date().getTime()) < 0) {
        alertTimeout('Certificato NON VALIDO', 1000);
        return false;
    }
    alertTimeout('Certificato VALIDO fine_validità : '+dataFineValidita.toDateString(), 1000);
    return true;
}