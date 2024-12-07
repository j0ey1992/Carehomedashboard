# Care Home Rota System

This system is designed to manage staff rotas for a care home, optimizing shift assignments while considering various factors such as staff availability, preferences, compliance, and workload.  It aims to create fair and efficient rotas, ensuring adequate coverage and minimizing conflicts.  The system integrates with other parts of the care home dashboard, providing a holistic view of staff management and operations.

## Key Features:

* **Weekly Rota Management:** Create, manage, edit, and delete rotas on a weekly basis.
* **Staff Management:** Comprehensive staff profiles including roles (`ShiftRole`), availability, preferences (`StaffPreferences`), contracted hours, performance metrics (`StaffPerformanceMetrics`), training status, leave (`StaffLeave`), compliance scores (`ComplianceScore`), training modules (`TrainingModule`), and certifications.
* **Shift Scheduling:** Schedule shifts for each day, specifying start and end times (`ShiftTime`), required staff numbers, and required roles (`ShiftRequirementWithRoles`). Easily add new shifts.
* **Staff Assignment:** Assign staff to shifts considering availability, preferences, compliance, and workload. Drag-and-drop functionality simplifies this process.
* **AI-Powered Shift Generation:**  An AI algorithm generates optimized rotas, prioritizing staff with higher compliance and lower workloads.  It considers training status, sickness (`StaffLeave`), and ensures each shift has a shift leader.  The AI respects staff contracted hours and night shift preferences.
* **Compliance Tracking:** Tracks staff compliance with training and certifications, highlighting compliance levels (`ComplianceLevel`).
* **Leave Management:** Easily add annual leave and sickness for staff.
* **Reporting and Statistics:** Generates reports and statistics on staff utilization, shift coverage, compliance, and leave (`RotaStats`).
* **Role-Based Access Control:** Supports Admin, Manager, and Staff roles with varying access levels. Managers manage staff within their assigned sites.

## Intended Workflow:

1. **Add Staff:** Admins and Managers add staff, including details and preferences.
2. **Create Rota:** Create a new weekly rota, specifying the start date.
3. **Schedule Shifts:** Define shifts, including requirements.
4. **Assign Staff (Manual):** Manually assign staff using drag-and-drop.
5. **Generate AI Rota:** Use the AI to generate an optimized rota.
6. **Review and Adjust:** Review and adjust the generated rota.
7. **Publish Rota:** Publish the finalized rota.

## Technical Details (Partial):

The system is built using React, Material UI, and Firebase. Data is stored in Firestore.  A context-based state management approach is used. The AI rota generation uses a custom algorithm (`rotaGenerator.ts`).

## Data Types:

* `ShiftTime`:  Represents shift times (e.g., '7:30-14:30').
* `ShiftType`: Represents shift types (e.g., 'morning', 'afternoon', 'night').
* `ShiftRole`: Represents staff roles (e.g., 'Driver', 'Shift Leader', 'Care Staff').
* `ShiftStatus`: Represents shift status (e.g., 'Unfilled', 'Partially Staffed', 'Fully Staffed', 'Conflict').
* `LeaveType`: Represents leave types (e.g., 'Annual', 'Sick', 'Maternity', 'Training', 'Other').
* `ComplianceLevel`: Represents compliance levels (e.g., 'High', 'Medium', 'Low').
* `ShiftAssignment`: Represents staff assigned to a shift.
* `ShiftRequirementWithRoles`: Represents role requirements for a shift.
* `StaffLeave`: Represents staff leave details.
* `TrainingModule`: Represents staff training modules.
* `StaffPreferences`: Represents staff preferences for shifts and working patterns.
* `StaffPerformanceMetrics`: Represents staff performance metrics.
* `ComplianceScore`: Represents staff compliance scores.
* `Staff`: Represents a staff member's profile.
* `RotaConfiguration`: Represents the configuration settings for a rota.
* `ShiftRequirements`: Represents the requirements for different shift types.
* `Rota`: Represents a complete rota schedule.
* `RotaValidationError`: Represents validation errors for a rota.
* `AISchedulerOptions`: Options for the AI scheduler.
* `AIShiftSuggestion`: AI suggestions for shift assignments.
* `StaffSuggestion`: Individual staff suggestions from the AI.
* `StaffEvaluation`: Evaluation metrics for a staff member.
* `RotaStats`: Statistics for a rota.
* `RotaImportData`: Data structure for importing rotas.


## System Integration:

The rota system integrates with other modules within the care home dashboard, including:

* **User Management:**  Staff data is managed centrally.
* **Compliance Module:**  Compliance scores are used in rota generation.
* **Training Module:** Training status is considered during shift assignments.
* **Leave Module:** Staff leave is integrated into the rota.


## Fairness and Optimization:

The system aims to create fair rotas by distributing shifts evenly among staff, considering their preferences and constraints.  The AI algorithm prioritizes staff with higher compliance and lower workloads.

## UI/UX Considerations:

The UI is designed to be intuitive and user-friendly, minimizing complexity and ensuring ease of use.

Ensure you can drag and drop users on any shift or any day. 
Allow set up of how many staff we need for the morning, afternoon and evening
Allow to generate rotas with AI but only for that week the UI is on. 


## Future Enhancements:

* Improved UI/UX for better usability and accessibility (ADHD-friendly design).
* Integration with additional care home systems.
* Advanced reporting and analytics capabilities.


**Note:** This README describes the intended functionality of the system. Due to ongoing development, some features may not be fully functional at this time.
