# 📖 Institutional Repository & Digital Library System
## Comprehensive User Training & Operations Manual

Welcome to the **Institutional Repository & Digital Library System**. This training manual is designed to guide library staff, academic curators, repository managers, and administrators through daily system operations, best practices, and system protocols.

---

## 🧭 Table of Contents
1. **Introduction & Hierarchy**
2. **System Roles & Permissions**
3. **Accessing the System & Security Policies**
4. **Browsing, Searching, and Discovering Assets**
5. **Depositing & Submitting Publications**
6. **Workflow Approvals & Review Procedures**
7. **System Administration & Database Backups**
8. **FAQs & Support Contacts**

---

## 1. Introduction & Hierarchy

Our Institutional Repository is structured around a clear three-tier logical hierarchy to simplify academic organizing and cross-referencing:

```
🏢 Communities (e.g., Faculty of Science, School of ICT)
 └── 📂 Collections (e.g., Masters Theses, Journal Articles, Technical Reports)
      └── 📄 Documents (Metadata + Secure File Attachments + Version Histories)
```

*   **Communities**: The top-level divisions, representing faculties, schools, research centers, or operational departments.
*   **Collections**: Specialized containers within a Community used to group related documents by type, academic degree, or discipline.
*   **Documents**: Individual records comprising extensive academic metadata, associated PDF/document attachments, dynamic version history logs, and review audit trails.

---

## 2. System Roles & Permissions

The system implements a rigid role-based access control (RBAC) structure. Self-registration is restricted; authorized administrators provision and manage all active accounts.

| Role | Target Audience | Primary Privileges |
| :--- | :--- | :--- |
| **Administrator** | Core IT Staff & Lead Curators | Full system control. Managing users, configuring communities & collections, deleting items, and downloading database backups. |
| **Repository Manager** | Library Directors / Department Heads | Creating and editing communities and collections, managing metadata schemas, reviewing logs, and downloading database backups. |
| **Curator** | Academic Reviewers & Editors | Managing submission workflows, reviewing uploaded documents, requesting edits, and approving/publishing records. |
| **Submitter / Student** | Faculty & Postgrad Researchers | Depositing new papers or theses into designated collection workflows. No administrative or workflow review access. |

---

## 3. Accessing the System & Security Policies

### 🔑 Authentication
*   **Sign In**: Enter your assigned institutional email and password on the login screen. Plaintext passwords are not stored in our database; they are fully hashed on-the-fly via advanced server-side encryption (bcrypt) to ensure security compliance.
*   **Account Provisioning**: Self-registration is strictly disabled. If you are a new faculty member or researcher requiring access, contact an **Administrator** or **authorized staff** to provision your institutional credentials.

### ⏳ Idle Inactivity Session Timeout
To guarantee the safety of sensitive academic data and student information in shared campus spaces (like libraries, computer labs, or department terminals):
*   **Auto-Logout Engine**: The system monitors all physical inputs (`click`, `scroll`, `keypress`, `mousemove`).
*   **30-Minute Threshold**: If no activity is detected for **30 consecutive minutes**, your session is automatically terminated and you are logged out.
*   **Security Notification**: Upon logout, a distinct, red **Security Alert Banner** is displayed at the top of the browser window to indicate your session has expired. You must sign in again to continue your session.

---

## 4. Browsing, Searching, and Discovering Assets

Our repository offers high-performance discovery tools tailored for quick citation retrieval:
1. **Search Banner**: Use the central search bar to query documents by title, author names, abstract keywords, or publisher dates.
2. **Sidebar Filters**: Refine search queries instantly by selecting specific Communities, Collections, or Document Formats.
3. **Layout Toggles**: Switch between the highly detailed **List View** (comprehensive metadata displays) and the compact **Grid View** (ideal for visual scanning) to match your browsing workflow.

---

## 5. Depositing & Submitting Publications

*(Designed for Submitters, Curators, and Academic Staff)*

Depositing your academic contribution into the repository follows a simple, structured metadata wizard:

1.  **Navigate to the Submissions Tab**: Locate the submission panel inside your active dashboard.
2.  **Define Community and Collection**: Select the appropriate institutional Community (e.g., *School of ICT*) and the Target Collection (e.g., *Master's Theses*).
3.  **Complete Publication Metadata**:
    *   **Title**: Complete title as it appears on the official document.
    *   **Authors**: Separate authors using commas (e.g., *Jane Doe, John Smith*).
    *   **Abstract / Summary**: A brief summary of the paper's scope and findings.
    *   **License/Rights**: Specify the distribution license (e.g., *CC-BY 4.0*, *All Rights Reserved*).
4.  **Upload Files**: Drag and drop your publication or click to browse. The server enforces security policies restricting files to authorized document formats (like `.pdf` and standard office document types).
5.  **Submit for Review**: Clicking **Submit** registers the publication in the database and launches a workflow ticket for academic curators to review.

---

## 6. Workflow Approvals & Review Procedures

*(Designed for Curators, Repository Managers, and Admins)*

All submitted publications undergo mandatory academic auditing before appearing in public searches:

1.  **Worklist Inspection**: Logged-in Curators can view pending submissions inside the dedicated **Workflow / Approvals** panel.
2.  **Evaluating Submissions**: Review the author’s input metadata and open file attachments to ensure formatting and naming conform to institutional standards.
3.  **Taking Action**:
    *   **Approve & Publish**: Publishes the document immediately. It is cataloged and made visible to all users.
    *   **Reject**: Prompts you to add a detailed note explaining the decision. The submitter will receive the feedback to revise and resubmit.

---

## 7. System Administration & Database Backups

*(Designed exclusively for Administrators and Repository Managers)*

### 👥 User Administration
Authorized staff can manage user credentials and system access via the **User Management Tab**:
*   To add a user, click **Register New User**, complete the institutional form, and assign an appropriate institutional role.
*   Administrators can instantly reset forgotten passwords for students or curators via the dashboard. Any password reset undergoes server-side encryption before storage.

### 💾 Downloading Database Backups
To support disaster recovery, backup redundancy, and compliance auditing:
1.  Navigate to the **Admin Settings Panel**.
2.  Click the **Download Database Backup** button.
3.  The system compiles a dynamically generated, fully relational **SQL Database Dump** (`database_backup_YYYY-MM-DD.sql`) containing:
    *   Structured `DROP TABLE` and `CREATE TABLE` instructions reflecting actual datastore relations.
    *   Column definitions explicitly mapped to relational types (`INTEGER`, `TEXT`, `BOOLEAN`, etc.).
    *   Transactional isolation clauses (`BEGIN TRANSACTION;` and `COMMIT;`) to ensure database consistency during restoration.
    *   Sanitized insert queries that can be easily parsed or imported directly into standard relational systems like **PostgreSQL** or **SQLite**.

---

## 8. FAQs & Support Contacts

#### Q: How do I recover my password if I am locked out?
A: Since user registration is fully managed by authorized staff, please contact your department's designated **Repository Administrator** to reset your password securely.

#### Q: Why can't I upload my ZIP or EXE file?
A: To defend our university servers against malicious payloads, file uploads are restricted to clean document formats (e.g., `.pdf`, `.docx`). 

#### Q: Can I retrieve an older version of a published paper?
A: Yes. All cataloged documents preserve their historical versions in the database. Open the document detail panel and select the **Versions** history log to inspect or restore previous drafts.

---

*For additional assistance or priority technical support, please contact the IT Service Desk or email the lead Repository Administrator at `library-admin@institution.edu`.*
