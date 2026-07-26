<script lang="ts">
  import "./demo.css";
  import Stage from "./Stage.svelte";
  import SceneTitle from "./scenes/SceneTitle.svelte";
  import SceneCapture from "./scenes/SceneCapture.svelte";
  import SceneShip from "./scenes/SceneShip.svelte";
</script>

<div class="faraday-demo">
  <Stage duration={12} width={1280} height={720}>
    <SceneTitle />
    <SceneCapture />
    <SceneShip />
  </Stage>
</div>
