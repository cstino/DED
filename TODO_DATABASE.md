# Task List: Database Updates and Final Changes

This document contains the instructions for manual database updates on Supabase and a list of changes to be deployed.

## 1. Supabase Manual Updates
Access your Supabase dashboard and add the following missing entries to the `subclasses` table. Use the **exact** English names to ensure consistency with existing records.

| Name | class_name |
| :--- | :--- |
| **Champion** | Fighter |
| **Battle Master** | Fighter |
| **Eldritch Knight** | Fighter |
| **Oath of Devotion** | Paladin |
| **Oath of the Ancients** | Paladin |
| **Oath of Vengeance** | Paladin |
| **Life Domain** | Cleric |
| **Light Domain** | Cleric |
| **Berserker** | Barbarian |

> [!NOTE]
> Check if some of these names (like `Battle Master`) are already present before adding to avoid duplicates.

## 2. Summary of Deployed Code Changes
The following UI/UX improvements have been implemented and are ready to be pushed:

- **Class Abilities**: Separated View and Edit modes for better readability.
- **Notes**: Now read-only in view mode, preventing accidental deletions or edits.
- **Spell List Security**: 
    - The "✕" button is now hidden by default (only visible in global "Edit" mode).
    - Added a safety confirmation dialog (*"Are you sure you want to delete...?"*) before removing a spell.
- **Equipment Details**: Improved icon consistency and color coding for armor vs shields.
- **Data Persistence**: Implemented `localStorage` drafts for NPC creation, Lore browser, and Session timeline to prevent data loss when switching tabs.
