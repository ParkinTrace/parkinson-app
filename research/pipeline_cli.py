"""ParkTrace Pipeline CLI (Reproducible End-to-End Workflow).

Single reproducible entry point for:
- Auditing the dataset
- Cleaning and verifying Tappy raw/harmonized records
- Benchmarking model families with grouped CV
- Running the scientific numerical audit
- Calibrating probabilities (Platt scaling) and exporting authoritative artifacts

Usage:
  python research/pipeline_cli.py audit
  python research/pipeline_cli.py clean-data
  python research/pipeline_cli.py benchmark
  python research/pipeline_cli.py audit-numerical
  python research/pipeline_cli.py calibrate
  python research/pipeline_cli.py all
"""

import argparse
import sys
import os

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO_ROOT)

def run_audit_cmd():
    print(">>> [Step 1] Running Dataset Audit...")
    from research.audit_data import run_audit
    run_audit()

def run_clean_data_cmd():
    print(">>> [Step 2] Running Tappy Data Cleaning & Validation Pipeline...")
    from research.clean_tappy_data import audit_and_clean_dataset
    audit_and_clean_dataset()

def run_benchmark_cmd():
    print(">>> [Step 3] Running Reproducible Multi-Model Benchmark...")
    from research.run_benchmark import main as benchmark_main
    benchmark_main()

def run_audit_numerical_cmd():
    print(">>> [Step 4] Running Final Scientific Numerical Audit...")
    from research.final_numerical_audit import run_audit as num_audit
    num_audit()

def run_calibrate_cmd():
    print(">>> [Step 5] Running Probability Calibration & Artifact Export...")
    from research.calibrate_models import run_calibration_experiment
    run_calibration_experiment()

def main():
    parser = argparse.ArgumentParser(description="ParkTrace ML Pipeline Automation CLI")
    parser.add_argument("command", choices=["audit", "clean-data", "benchmark", "audit-numerical", "calibrate", "all"],
                        help="Command to run")
    args = parser.parse_args()

    if args.command == "audit":
        run_audit_cmd()
    elif args.command == "clean-data":
        run_clean_data_cmd()
    elif args.command == "benchmark":
        run_benchmark_cmd()
    elif args.command == "audit-numerical":
        run_audit_numerical_cmd()
    elif args.command == "calibrate":
        run_calibrate_cmd()
    elif args.command == "all":
        print("=======================================================")
        print("PARKTRACE: REPRODUCIBLE END-TO-END PIPELINE AUTOMATION")
        print("=======================================================")
        run_audit_cmd()
        print("\n-------------------------------------------------------")
        run_clean_data_cmd()
        print("\n-------------------------------------------------------")
        run_benchmark_cmd()
        print("\n-------------------------------------------------------")
        run_audit_numerical_cmd()
        print("\n-------------------------------------------------------")
        run_calibrate_cmd()
        print("\n=======================================================")
        print("PIPELINE COMPLETED SUCCESSFULLY!")
        print("=======================================================")

if __name__ == "__main__":
    main()
