"""Edge perception: computer-vision defect detection on rendered pixels.

``cv_detect`` is the classical-CV defect detector that runs on each rendered
crop — the workload modelled as running on the UAV's Nvidia Jetson. It is
deliberately deterministic (no training data, no GPU randomness) so runs are
reproducible, yet it genuinely operates on the rendered image pixels.
"""
