# TMSplitter: Split exported .txt (JSON) files into smaller chunks
I [haven't been able to import](https://github.com/Tampermonkey/tampermonkey/issues/2492) a large export "to file" that I made with TamperMonkey; it gave me
> Message length exceeded maximum allowed length

and croaked.
<img width="1920" height="940" alt="Capture 2025-07-13 16-36-46" src="https://github.com/user-attachments/assets/1309d98d-9569-481f-a11f-3767d155cb28" />

So, since there has been no movement on the issue tracker, I wrote this utility to split up the contents of an exported .txt/json file into smaller importable chunks.  
My file was > 66MB large. This can happen when there is a lot of data in the script's storage (and storage is included in the export, of course)

Using this, I found that I could get up to about 60MB before it failed, but I expect there to be differences according to individual overhead.

## Features
- Parses exported file and creates smaller importable chunks according to a maximum file size
- If a single script exceeds the maximum size, offers to drop either the script's included "requires", "storage", or both, if that would make it fit.
- See the output for conflicting files

<img width="818" height="428" alt="image" src="https://github.com/user-attachments/assets/b8d5c256-cc7b-4074-affb-6ba4ff333497" />
(This example is forced with a low max length, to quickly find a script to showcase this. In reality, the maximum allowed size should be much larger)

## Usage
- This is a Node.js project: If not yet present, [install it first](https://nodejs.org/en/download); you may have to restart your machine.
- Ideally, make sure that the path to the node executable is in your system's [PATH environment variable](https://www3.ntu.edu.sg/home/ehchua/programming/howto/Environment_Variables.html)
  - Alternatively, call the script with a direct path to it (see below)
- Download or clone this repository
- Windows: This comes with a .cmd launcher. You can drag/drop a TM export file (.txt/json) onto it, and it should ingest it.
  - if the system can't find the node executable, you can edit the .cmd file's content:
  - ~~`node "%~dp0splitTMExport.cjs" %*`~~ to `"<path-to-executable>" "%~dp0splitTMExport.cjs" %*` (You may need the quotes)
- In general: You can call the script with node in the terminal of your choice, like `node splitTMExport.cjs "<path-to-exported-file>"`
- You can adjust some simple settings in the [splitTMExport.cjs](https://github.com/Black-Platypus/TMSplitter/blob/main/splitTMExport.cjs#L9) file, see below.

## Settings
There are some constants/variables at the top of the .cjs script that you can change to your needs:
- `srcFile`: The file to work on, if the script is not called with any further argument (or a dropped file is used on the .cmd launcher)
- `outDir`: Path/Pattern for the directory to which to write the exported files.
  - Default: `${srcPathNoExt}-${maxLength}`
  - Supports:
    - [Common placeholders](#common-placeholders)
- `outFileBase`: Name/Pattern for the exported files.
  - Default: `${srcFileNoExt}-${n}`
  - Supports:
    - [Common placeholders](#common-placeholders)
    - `${n}`: Chunk number (padded with appropriate zeroes)
- `alwaysIncludeSettings`: Whether or not to include the exported TM settings in every chunk. That would give you the opportunity to re-import the settings when importing any single chunk, for convenience.
  - Default: `false`
- `maxPartLength`: The approximate maximum file size to export chunks in, in bytes. This script tries to keep the chunks below this size. I was able to import a chunk just about 60 MB in size, but your mileage may vary.
  - Default: `50*1024*1024` (50 MB (actually MiB))
- `maxScriptsPerPart`: A limit to how many scripts should be exported in a chunk at a time. Just for convenience; I expect the `maxPartLength` to be more important
  - Default: `200`

### Common placeholders
The following placeholders can be used for the settings constants/variables where specified above, by wrapping them in `${}`  
  i.e. to refer to the `srcPath`, use `${srcPath}`
- `/`: Will be replaced with the appropriate path separator (`/`, `\`)
- `srcPath`: The directory path that contains the source file. For `C:\My Folder\Exported-file.txt`, this would be `C:\My Folder`
- `srcFile`: The "base name" of the source file. For `C:\My Folder\Exported-file.txt`, this would be `C:\My Folder\Exported-file.txt`
- `srcFileNoExt`: The "base name" of the source file, without extension. For `C:\My Folder\Exported-file.txt`, this would be `Exported-file`
- `srcPathNoExt`: The path of the source file, without extension. For `C:\My Folder\Exported-file.txt`, this would be `C:\My Folder\Exported-file`
- `maxLength`: The `maxPartLength`, formatted as appropriate, i.e. "50MB"
