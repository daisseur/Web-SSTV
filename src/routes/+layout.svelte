<script lang="ts">
    import "../app.css";
    let { children } = $props();
</script>

<nav class="container">
    <ul>
        <li><strong><a href="/" class="contrast">Web SSTV</a></strong></li>
    </ul>
    <ul>
        <li><a href="/encode">Encode</a></li>
        <li><a href="/decode">Decode</a></li>
        <li><a href="/learn">Learn</a></li>
    </ul>
</nav>

{@render children()}

<footer >
    <small>SSTV signal decoding and more encoding modes coming soon.</small>
    <br>
    <small><a href="https://github.com/CKegel/Web-SSTV/">Check out the project on Github</a></small>
    <br>
    <small>&copy 2024 Christian Kegel - Available under the MIT License</small>
</footer>