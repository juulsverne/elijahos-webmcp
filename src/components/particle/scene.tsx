"use client";

import {
  CORE_BLOB_DETAIL,
  CORE_RADIUS,
  OUTER_SHELL_DETAIL,
  OUTER_SHELL_RADIUS,
  SCENE_SCALE,
} from "./constants";
import { InteractionLayer } from "./InteractionLayer";
import type { ParticleSceneController } from "./runtime";
import { DeformingBlobLayer } from "./scene/DeformingBlobLayer";
import { DragRig, ParallaxRig, TimeUpdater } from "./scene/rigs";

export function ParticleScene({
  controller,
}: {
  controller: ParticleSceneController;
}) {
  return (
    <>
      <TimeUpdater controller={controller} />
      <ParallaxRig>
        <DragRig controller={controller}>
          <group scale={SCENE_SCALE}>
            <InteractionLayer controller={controller} />
            <DeformingBlobLayer
              controller={controller}
              detail={CORE_BLOB_DETAIL}
              lineOpacity={0.18}
              mode="core"
              pointOpacity={0.72}
              pointSize={0.064}
              radius={CORE_RADIUS}
              rippleStrength={0.22}
              tangentStrength={0.28}
            />
            <DeformingBlobLayer
              controller={controller}
              detail={OUTER_SHELL_DETAIL}
              lineOpacity={0.13}
              mode="shell"
              pointOpacity={1}
              pointSize={0.058}
              radius={OUTER_SHELL_RADIUS}
              rippleStrength={0.58}
              tangentStrength={0.68}
            />
          </group>
        </DragRig>
      </ParallaxRig>
    </>
  );
}
