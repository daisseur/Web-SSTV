<script lang="ts">
    import { onMount } from "svelte";
    import { bufferToWave, Format, MartinMOne, MartinMTwo, PD120, PD160, PD180, PD240, PD290, PD50, PD90, ScottieDX, ScottieOne, ScottieTwo, WrasseSC2180 } from "$lib/encode";

    let audioCtx: AudioContext;
    let imageLoaded = $state(false);   

    let warningMessage = $state("");
    let selectedMode: string = $state("none");
    let callSign: string = $state("");
    let callSignLocation: string = $state("top-left");

    let imgPicker: HTMLInputElement = $state(null as unknown as HTMLInputElement);
    let imgName = $derived(() => imgPicker.value.split("\\")[2].split(".")[0]);
    let canvas: HTMLCanvasElement;
    let canvasCtx: CanvasRenderingContext2D;

    let rawImage: HTMLImageElement;
    let sstvFormat: Format;

    let wavBlob: Blob;
    let audioUrl: string = $state("");


    function drawPreview() {
        if (!sstvFormat) {
            warningMessage = "No mode selected";
            return;
        }

        const canvasCtx = canvas.getContext("2d")!;
        canvas.width = sstvFormat.getVertResolution();
        canvas.height = sstvFormat.getNumScanLines();
        canvasCtx.drawImage(rawImage,0,0, canvas.width, canvas.height);
        canvasCtx.font = "bold 24pt sans-serif";

        let callSignYCord;
        if(callSignLocation== "top-left")
            callSignYCord = 30;
        else if(callSignLocation== "bottom-left")
            callSignYCord = sstvFormat.getNumScanLines() - 6;

        canvasCtx.fillText(callSign, 10, callSignYCord as number);
        canvasCtx.strokeStyle = "white";
        canvasCtx.strokeText(callSign, 10, callSignYCord as number);
        imageLoaded = true;
    }

    function pickImage(event: Event) {
        const fileInput = event.target as HTMLInputElement;
        const file = fileInput.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            rawImage.src = reader.result as string;
            console.log(rawImage.src);
            if (selectedMode !== "none") {
                warningMessage = "";
            }
        };
        reader.readAsDataURL(file);
    }

    function preloadSSTVMode() {
        if(selectedMode!= "none"){
            warningMessage = "";
        }
        if(selectedMode== "M1")
            sstvFormat = new MartinMOne();
        else if(selectedMode== "M2")
            sstvFormat = new MartinMTwo();
        else if(selectedMode== "S1")
            sstvFormat = new ScottieOne();
        else if(selectedMode== "S2")
            sstvFormat = new ScottieTwo();
        else if(selectedMode== "SDX")
            sstvFormat = new ScottieDX();
        else if(selectedMode== "PD50")
            sstvFormat = new PD50();
        else if(selectedMode== "PD90")
            sstvFormat = new PD90();
        else if(selectedMode== "PD120")
            sstvFormat = new PD120();
        else if(selectedMode== "PD160")
            sstvFormat = new PD160();
        else if(selectedMode== "PD180")
            sstvFormat = new PD180();
        else if(selectedMode== "PD240")
            sstvFormat = new PD240();
        else if(selectedMode== "PD290")
            sstvFormat = new PD290();
        // else if(selectedMode== "RobotBW8")
        //     sstvFormat = new RobotBW8();
        else if(selectedMode== "WrasseSC2180")
            sstvFormat = new WrasseSC2180();

        if(imageLoaded) drawPreview();
    }
    
    async function startEncode() {
    if (!imageLoaded) {
        warningMessage = "No image loaded";
        return;
    }
    if (selectedMode === "none") {
        warningMessage = "No mode selected";
        return;
    }

    warningMessage = "Processing...";

    // Récupération des données de l'image
    const canvasData = canvasCtx.getImageData(0, 0, canvas.width, canvas.height);
    sstvFormat.prepareImage(canvasData.data as unknown as number[][][]);

    try {
        // Encode les données SSTV sans attendre le temps réel
        const audioData = sstvFormat.encodeSSTVData();

        // Transformation des données audio en AudioBuffer pour le traitement
        const audioBuffer = new AudioBuffer({
            length: audioData.length,
            sampleRate: audioCtx.sampleRate
        });

        audioBuffer.copyToChannel(new Float32Array(audioData), 0);

        // Transformation en buffer WAV
        const wavBuffer = bufferToWave(audioBuffer, audioBuffer.length);
        wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
        audioUrl = URL.createObjectURL(wavBlob);

        warningMessage = "";
    } catch (error) {
        warningMessage = "An error occurred during encoding.";
        console.log("Encoding error:", error);
    }
}


    onMount(() => {
        audioCtx = new AudioContext();
        canvasCtx = canvas.getContext("2d") as CanvasRenderingContext2D;
        rawImage = new Image();
        rawImage.onload = () => { drawPreview() };
    })
</script>

<main class="container">
    <label for="modeSelect">Select a mode:</label>
    <select bind:value={selectedMode} onchange={preloadSSTVMode}>
        <option value="none" selected disabled hidden>No mode selected</option>
        <option value="none" disabled>--- Martin ---</option>
        <option value="M1">Martin M1</option>
        <option value="M2">Martin M2</option>
        <option value="none" disabled>--- Scottie ---</option>
        <option value="S1">Scottie 1</option>
        <option value="S2">Scottie 2</option>
        <option value="SDX">Scottie DX</option>
        <option value="none" disabled>--- WRASSE ---</option>
        <option value="WrasseSC2180">SC2-180</option>
        <option value="none" disabled>--- PD ---</option>
        <option value="PD50">PD-50</option>
        <option value="PD90">PD-90</option>
        <option value="PD120">PD-120</option>
        <option value="PD160">PD-160</option>
        <option value="PD180">PD-180</option>
        <option value="PD240">PD-240</option>
        <option value="PD290">PD-290</option>
    </select>

    <label for="imgPicker">Upload an image:</label>
    <input type="file" name="imgPicker" bind:value={imgPicker} onchange={pickImage} accept="image/*" disabled={selectedMode == "none"}/>
    <center id="imgArea" class="container">
        <canvas bind:this={canvas}></canvas>
        <br>
        <span>{warningMessage}</span>
    </center>
    <div id="callSignControls">   
        <label for="callSign">Enter your callsign (optional):</label>
        <input type="text" name="callSign" bind:value={callSign} onchange={() => { if (imageLoaded) drawPreview(); }} placeholder="Call Sign" />
        <label for="callSignLocation">Call Sign Location:</label>
        <select name="callSignLocation" bind:value={callSignLocation} onchange={() => {
            if (imageLoaded) {
                drawPreview();
            }
        }}>
            <option value="top-left" selected>Top Left</option>
            <option value="bottom-left" >Bottom Left</option>
        </select>
    </div>

    <button onclick={startEncode} class="contrast" disabled={!imageLoaded}>Encode</button>
    {#if audioUrl}
        <audio src={audioUrl} controls></audio>
        <a href={audioUrl} download={`sstv_${imgName}.wav`}>Download</a>
    {/if}

</main>