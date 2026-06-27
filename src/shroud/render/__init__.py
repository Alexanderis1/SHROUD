"""Offscreen rendering + camera geometry for the hybrid CV pipeline.

The 3D asset is rendered to real RGB pixels from each UAV viewpoint; defects are
baked into the scene as decals, so the CV detector works on genuine rendered
imagery. ``camera`` is the pure-numpy projection / ray-cast math (no GL);
``renderer`` is the pyrender offscreen renderer.
"""
