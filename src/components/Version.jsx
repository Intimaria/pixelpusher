import React from 'react'
import {is} from 'immutable'
import Preview from './Preview';
import Button from './Button';
import classnames from 'classnames'
import * as Versions from '../logic/Versions'

export default class Version extends React.Component {
  render() {
    const {currentProject, project, indent} = this.props
    const isCurrent = currentProject === project

    const isSame = is(project, currentProject)
    const color = Versions.color(project)

    return (
      <div
        className={classnames("version", {
          "version-selected": isCurrent,
        })}
        onClick={this.openProject(project._actorId)}
        key={project._actorId}
        style={{marginLeft: indent * 5}}
      >
        <div className="version__preview" style={{borderColor: color}}>
          { project
            ? <Preview
                animate
                frameIndex={0}
                duration={1}
                project={project.set('cellSize', 3)}
              />
            : null}
        </div>
        <div className="version__text">

          { isCurrent
            ? null
            : <Button tiny icon="merge" disabled={isSame} onClick={this.mergeProject(project._actorId)} /> }

          { isCurrent
            ? null
            : <Button tiny icon="delete" onClick={this.deleteProject(project._actorId)} /> }
        </div>
      </div>
    )
  }

  openProject = id => e => {
    e.stopPropagation()
    this.props.dispatch({type: 'SET_PROJECT', id})
  }

  deleteProject = id => e => {
    e.stopPropagation()
    this.props.dispatch({type: 'DELETE_PROJECT_CLICKED', id})
  }

  mergeProject = id => e => {
    e.stopPropagation()
    this.props.dispatch({type: 'MERGE_PROJECT_CLICKED', id})
  }
}
