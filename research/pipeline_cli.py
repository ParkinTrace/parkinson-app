"""ParkTrace Pipeline CLI (Checklist Priority 5, Items #101-#108).

Single reproducible workflow for:
- Auditing the dataset
- Benchmarking model families with grouped CV
- Ablation testing of candidate features
- Calibrating probabilities (Platt scaling) and exporting authoritative artifacts

Usage:
  python research/pipeline_cli.py audit
  python research/pipeline_cli.py benchmark
  python research/pipeline_cli.py calibrate
  python research/pipeline_cli.py all
"""

import argparse
import sys
import os

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO_ROOT)

def run_audit_cmd():
    print(">>> [1/3] Running Dataset Audit...")
    from research.audit_data import run_audit
    run_audit()

def run_benchmark_cmd():
    print(">>> [2/3] Running Reproducible Multi-Model Benchmark...")
    from research.run_benchmark import main as benchmark_main
    benchmark_main()

def run_calibrate_cmd():
    print(">>> [3/3] Running Probability Calibration & Artifact Export...")
    from research.calibrate_models import run_calibration_experiment
    run_calibration_experiment()

def main():
    parser = argparse.ArgumentParser(description="ParkTrace ML Pipeline Automation CLI")
    parser.add_argument("command", choices=["audit", "benchmark", "calibrate", "all"],
                        help="Command to run")
    args = parser.parse_args()

    if args.command == "audit":
        run_audit_cmd()
    elif args.command == "benchmark":
        run_benchmark_cmd()
    elif args.command == "calibrate":
        run_calibrate_cmd()
    elif args.command == "all":
        print("=======================================================")
        print("PARKTRACE: REPRODUCIBLE END-TO-END PIPELINE AUTOMATION")
        print("=======================================================")
        run_audit_cmd()
        print("\n-------------------------------------------------------")
        run_benchmark_cmd()
        print("\n-------------------------------------------------------")
        run_calibrate_cmd()
        print("\n=======================================================")
        print("PIPELINE COMPLETED SUCCESSFULLY!")
        print("=======================================================")

if __name__ == "__main__":
    main()
